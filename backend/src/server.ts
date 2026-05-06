import express from 'express';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const isProd = process.env.NODE_ENV === 'production';
const corsOrigin = process.env.CORS_ORIGIN?.trim();
const rateWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
const rateMax = Number(process.env.RATE_LIMIT_MAX ?? 120);
const echoMaxTopLevelKeys = Number(process.env.ECHO_MAX_KEYS ?? 32);
const echoMaxStringLength = Number(process.env.ECHO_MAX_STRING_LENGTH ?? 2048);

type AppOptions = {
  logRequests?: boolean;
  corsOrigin?: string;
  rateLimitWindowMs?: number;
  rateLimitMax?: number;
};

function requestIdFromResponse(res: express.Response): string {
  const header = res.getHeader('x-request-id');
  return typeof header === 'string' && header.length > 0 ? header : 'unknown';
}

function sanitizeRequestId(raw: string | undefined): string {
  if (!raw) return randomUUID();
  const trimmed = raw.trim();
  if (!trimmed) return randomUUID();
  const safe = trimmed.replaceAll(/[^A-Za-z0-9._:-]/g, '');
  if (!safe) return randomUUID();
  return safe.slice(0, 128);
}

function sendError(
  res: express.Response,
  status: number,
  code: string,
  message: string,
): void {
  res.setHeader('cache-control', 'no-store');
  res.status(status).json({
    error: {
      code,
      message,
      requestId: requestIdFromResponse(res),
    },
  });
}

export function createApp(options: AppOptions = {}): express.Express {
  const app = express();
  const requestHits = new Map<string, { count: number; resetAt: number }>();
  const logRequests = options.logRequests ?? process.env.NODE_ENV !== 'test';
  const allowedCorsOrigin = options.corsOrigin?.trim() || corsOrigin;
  const effectiveRateWindowMs = options.rateLimitWindowMs ?? rateWindowMs;
  const effectiveRateMax = options.rateLimitMax ?? rateMax;
  let lastPruneAt = 0;

  const pruneExpiredRateLimitEntries = (now: number) => {
    if (now - lastPruneAt < 30_000) return;
    lastPruneAt = now;
    for (const [key, value] of requestHits.entries()) {
      if (now > value.resetAt) {
        requestHits.delete(key);
      }
    }
  };

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '64kb' }));
  app.use((req, res, next) => {
    const requestId = sanitizeRequestId(req.header('x-request-id'));
    res.setHeader('x-request-id', requestId);
    const reqOrigin = req.header('origin')?.trim();
    if (allowedCorsOrigin && reqOrigin && reqOrigin !== allowedCorsOrigin) {
      sendError(res, 403, 'CORS_ORIGIN_DENIED', 'Origin is not allowed by CORS policy.');
      return;
    }
    if (allowedCorsOrigin) {
      res.setHeader('access-control-allow-origin', allowedCorsOrigin);
      res.setHeader('vary', 'origin');
      res.setHeader('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('access-control-allow-headers', 'content-type,authorization,x-request-id');
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });
  app.use((req, res, next) => {
    if (req.path === '/health' || req.path === '/live' || req.path === '/ready') {
      next();
      return;
    }
    const now = Date.now();
    pruneExpiredRateLimitEntries(now);
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const hit = requestHits.get(ip);
    if (!hit || now > hit.resetAt) {
      requestHits.set(ip, { count: 1, resetAt: now + effectiveRateWindowMs });
      next();
      return;
    }
    if (hit.count >= effectiveRateMax) {
      const retryAfterSeconds = Math.max(1, Math.ceil((hit.resetAt - now) / 1000));
      res.setHeader('retry-after', String(retryAfterSeconds));
      sendError(res, 429, 'RATE_LIMITED', 'Too many requests. Retry later.');
      return;
    }
    hit.count += 1;
    next();
  });
  app.use((req, _res, next) => {
    if (!logRequests) {
      next();
      return;
    }
    // lightweight structured request log for incident triage
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        event: 'request',
        method: req.method,
        path: req.path,
        ip: req.ip,
        at: new Date().toISOString(),
      }),
    );
    next();
  });

  app.get('/health', (_req, res) => {
    res.status(200).json({ ok: true, service: 'location-emitter-backend' });
  });

  app.get('/live', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.get('/ready', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.post('/echo', (req, res) => {
    if (!req.is('application/json')) {
      sendError(res, 415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json.');
      return;
    }
    if (
      typeof req.body !== 'object' ||
      req.body == null ||
      Array.isArray(req.body)
    ) {
      sendError(res, 422, 'INVALID_BODY', 'Request body must be a JSON object.');
      return;
    }
    const body = req.body as Record<string, unknown>;
    const keys = Object.keys(body);
    if (keys.length > echoMaxTopLevelKeys) {
      sendError(
        res,
        422,
        'ECHO_TOO_MANY_KEYS',
        `Request body exceeds maximum top-level keys (${echoMaxTopLevelKeys}).`,
      );
      return;
    }
    for (const key of keys) {
      const value = body[key];
      if (typeof value === 'string' && value.length > echoMaxStringLength) {
        sendError(
          res,
          422,
          'ECHO_STRING_TOO_LONG',
          `String field "${key}" exceeds max length (${echoMaxStringLength}).`,
        );
        return;
      }
    }
    res.status(200).json({ ok: true, received: body });
  });

  app.use((req, res) => {
    sendError(res, 404, 'NOT_FOUND', `No route for ${req.method} ${req.path}`);
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (
      typeof error === 'object' &&
      error != null &&
      'type' in error &&
      error.type === 'entity.parse.failed'
    ) {
      sendError(res, 400, 'INVALID_JSON', 'Malformed JSON request body.');
      return;
    }
    if (
      typeof error === 'object' &&
      error != null &&
      'type' in error &&
      error.type === 'entity.too.large'
    ) {
      sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'Request payload exceeds the allowed size limit.');
      return;
    }
    const msg = error instanceof Error ? error.message : 'Unexpected server error';
    sendError(res, 500, 'INTERNAL_ERROR', isProd ? 'Unexpected server error' : msg);
  });
  return app;
}

const isMainModule = process.argv[1] != null && fileURLToPath(import.meta.url) === process.argv[1];
if (isMainModule) {
  const port = Number(process.env.PORT ?? 8080);
  createApp().listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`backend listening on :${port}`);
  });
}
