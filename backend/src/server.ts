import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pino from 'pino';
import { authMiddleware } from './auth.js';
import { closeDatabaseConnection, initializeDatabase, runMigrations } from './db/database.js';
import { echoRouter } from './routes/echo.js';
import { healthRouter } from './routes/health.js';
import { todosRouter } from './routes/todos.js';
import { sendError } from './utils.js';
import { setupWebSocket } from './websocket.js';

const isProduction = process.env.NODE_ENV === 'production';
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isProduction ? undefined : {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

const corsOrigin = process.env.CORS_ORIGIN?.trim();
const rateWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
const rateMax = Number(process.env.RATE_LIMIT_MAX ?? 120);

type AppOptions = {
  logRequests?: boolean;
  corsOrigin?: string;
  rateLimitWindowMs?: number;
  rateLimitMax?: number;
};

function sanitizeRequestId(raw: string | undefined): string {
  if (!raw) return randomUUID();
  const trimmed = raw.trim();
  if (!trimmed) return randomUUID();
  const safe = trimmed.replaceAll(/[^A-Za-z0-9._:-]/g, '');
  if (!safe) return randomUUID();
  return safe.slice(0, 128);
}

export function createApp(options: AppOptions = {}): express.Express {
  const app = express();
  const logRequests = options.logRequests ?? process.env.NODE_ENV !== 'test';
  const allowedCorsOrigin = options.corsOrigin?.trim() || corsOrigin;
  const effectiveRateWindowMs = options.rateLimitWindowMs ?? rateWindowMs;
  const effectiveRateMax = options.rateLimitMax ?? rateMax;

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '64kb' }));

  // Request ID and CORS
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

  // Rate Limiting
  const limiter = rateLimit({
    windowMs: effectiveRateWindowMs,
    limit: effectiveRateMax,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => ['/health', '/live', '/ready'].includes(req.path),
    handler: (req, res) => {
      sendError(res, 429, 'RATE_LIMITED', 'Too many requests. Retry later.');
    },
  });
  app.use(limiter);

  // Logging
  app.use((req, res, next) => {
    if (!logRequests) {
      next();
      return;
    }
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info({
        event: 'request',
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
        ip: req.ip,
        requestId: res.getHeader('x-request-id'),
      });
    });
    next();
  });

  app.use(healthRouter);
  
  // Public Auth Routes
  app.post('/auth/login', (req, res) => {
    const { username, password } = req.body;
    // POC: Allow any user with password 'lep-secret'
    if (password === 'lep-secret') {
      const token = jwt.sign(
        { id: username || 'demo-user', role: 'user' }, 
        process.env.JWT_SECRET || 'lep-fallback-secret-2026',
        { expiresIn: '24h' }
      );
      res.json({ token });
    } else {
      sendError(res, 401, 'AUTH_FAILED', 'Invalid credentials.');
    }
  });

  // Protected Routes
  app.use('/api', authMiddleware);
  app.use('/api/todos', todosRouter);
  app.use('/api', echoRouter);

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
    
    logger.error({ error, requestId: res.getHeader('x-request-id') }, 'Unhandled error');
    let errorMessage = 'Unexpected server error';
    if (!isProduction && error instanceof Error) {
      errorMessage = error.message;
    }
    sendError(res, 500, 'INTERNAL_ERROR', errorMessage);
  });

  return app;
}

import cluster from 'node:cluster';
import { createServer } from 'node:http';
import os from 'node:os';

const isMainModule = process.argv[1] != null && fileURLToPath(import.meta.url) === process.argv[1];
if (isMainModule) {
  if (cluster.isPrimary && process.env.NODE_ENV === 'production') {
    const numCPUs = os.cpus().length;
    // eslint-disable-next-line no-console
    console.log(`Primary ${process.pid} is running. Forking ${numCPUs} workers...`);
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }
    cluster.on('exit', (worker, _code, _signal) => {
      // eslint-disable-next-line no-console
      console.log(`Worker ${worker.process.pid} died. Restarting...`);
      cluster.fork();
    });
  } else {
    const port = Number(process.env.PORT ?? 8080);
    const app = createApp();
    const httpServer = createServer(app);
    
    // Initialize database and run migrations
    initializeDatabase();
    try {
      await runMigrations();
    } catch (error) {
      logger.error({ error }, 'Failed to run migrations');
      process.exit(1);
    }
    
    // Setup WebSocket
    setupWebSocket(httpServer);

    httpServer.listen(port, () => {
      logger.info({ port }, `Worker ${process.pid} listening`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      httpServer.close(async () => {
        await closeDatabaseConnection();
        process.exit(0);
      });
    });
  }
}
