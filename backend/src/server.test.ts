import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from './server.js';

const app = createApp({
  logRequests: false,
  corsOrigin: 'https://allowed.example',
  rateLimitMax: 8,
  rateLimitWindowMs: 120,
});
const server = app.listen(0);
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

describe('backend server', () => {
  it('returns health payload and x-request-id', async () => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.has('x-request-id'), true);
    const body = (await res.json()) as { ok: boolean; service: string };
    assert.equal(body.ok, true);
    assert.equal(body.service, 'location-emitter-backend');
  });

  it('returns structured 404 error envelope', async () => {
    const res = await fetch(`${base}/missing`);
    assert.equal(res.status, 404);
    const body = (await res.json()) as { error: { code: string; message: string; requestId: string } };
    assert.equal(body.error.code, 'NOT_FOUND');
    assert.match(body.error.message, /No route for GET/);
    assert.equal(typeof body.error.requestId, 'string');
    assert.ok(body.error.requestId.length > 0);
    assert.equal(res.headers.get('cache-control'), 'no-store');
  });

  it('preserves provided x-request-id', async () => {
    const reqId = 'req-fixed-123';
    const res = await fetch(`${base}/health`, { headers: { 'x-request-id': reqId } });
    assert.equal(res.headers.get('x-request-id'), reqId);
  });

  it('sanitizes unsafe x-request-id header values', async () => {
    const res = await fetch(`${base}/health`, {
      headers: { 'x-request-id': '  bad id <script>@#$%^&*()__ok  ' },
    });
    const rid = res.headers.get('x-request-id') ?? '';
    assert.equal(res.status, 200);
    assert.equal(rid.includes(' '), false);
    assert.equal(rid.includes('<'), false);
    assert.equal(rid.includes('@'), false);
    assert.match(rid, /^[A-Za-z0-9._:-]+$/);
  });

  it('caps x-request-id length to 128 characters', async () => {
    const veryLong = 'a'.repeat(400);
    const res = await fetch(`${base}/health`, {
      headers: { 'x-request-id': veryLong },
    });
    const rid = res.headers.get('x-request-id') ?? '';
    assert.equal(res.status, 200);
    assert.equal(rid.length, 128);
  });

  it('handles CORS preflight requests', async () => {
    const res = await fetch(`${base}/health`, { method: 'OPTIONS' });
    assert.equal(res.status, 204);
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://allowed.example');
    assert.equal(res.headers.get('access-control-allow-methods'), 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    assert.equal(
      res.headers.get('access-control-allow-headers'),
      'content-type,authorization,x-request-id',
    );
  });

  it('includes allowed CORS origin header on normal requests', async () => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://allowed.example');
  });

  it('rejects mismatched CORS origin', async () => {
    const res = await fetch(`${base}/health`, {
      headers: { origin: 'https://evil.example' },
    });
    assert.equal(res.status, 403);
    const body = (await res.json()) as { error: { code: string; requestId: string } };
    assert.equal(body.error.code, 'CORS_ORIGIN_DENIED');
    assert.equal(typeof body.error.requestId, 'string');
    assert.equal(res.headers.get('cache-control'), 'no-store');
  });

  it('returns INVALID_JSON for malformed request body', async () => {
    const res = await fetch(`${base}/echo`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: '{"bad":',
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: { code: string; requestId: string } };
    assert.equal(body.error.code, 'INVALID_JSON');
    assert.equal(typeof body.error.requestId, 'string');
    assert.equal(res.headers.get('cache-control'), 'no-store');
  });

  it('returns PAYLOAD_TOO_LARGE for oversized request body', async () => {
    const huge = 'x'.repeat(70_000);
    const res = await fetch(`${base}/echo`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ huge }),
    });
    assert.equal(res.status, 413);
    const body = (await res.json()) as { error: { code: string; requestId: string } };
    assert.equal(body.error.code, 'PAYLOAD_TOO_LARGE');
    assert.equal(typeof body.error.requestId, 'string');
    assert.equal(res.headers.get('cache-control'), 'no-store');
  });

  it('returns INVALID_BODY for non-object JSON bodies', async () => {
    const arrayRes = await fetch(`${base}/echo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify([1, 2, 3]),
    });
    assert.equal(arrayRes.status, 422);
    const arrayBody = (await arrayRes.json()) as { error: { code: string; requestId: string } };
    assert.equal(arrayBody.error.code, 'INVALID_BODY');
    assert.equal(typeof arrayBody.error.requestId, 'string');
    assert.equal(arrayRes.headers.get('cache-control'), 'no-store');

    const strRes = await fetch(`${base}/echo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify('plain-text'),
    });
    assert.equal(strRes.status, 400);
    const strBody = (await strRes.json()) as { error: { code: string; requestId: string } };
    assert.equal(strBody.error.code, 'INVALID_JSON');
    assert.equal(typeof strBody.error.requestId, 'string');
    assert.equal(strRes.headers.get('cache-control'), 'no-store');
  });

  it('echoes valid object payload and keeps request-id correlation', async () => {
    const reqId = 'echo-request-42';
    const payload = { a: 1, nested: { b: 'ok' } };
    const res = await fetch(`${base}/echo`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-request-id': reqId,
      },
      body: JSON.stringify(payload),
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-request-id'), reqId);
    const body = (await res.json()) as { ok: boolean; received: unknown };
    assert.equal(body.ok, true);
    assert.deepEqual(body.received, payload);
  });

  it('returns UNSUPPORTED_MEDIA_TYPE for non-json content-type', async () => {
    const res = await fetch(`${base}/echo`, {
      method: 'POST',
      headers: {
        'content-type': 'text/plain',
      },
      body: 'hello',
    });
    assert.equal(res.status, 415);
    const body = (await res.json()) as { error: { code: string; requestId: string } };
    assert.equal(body.error.code, 'UNSUPPORTED_MEDIA_TYPE');
    assert.equal(typeof body.error.requestId, 'string');
    assert.equal(res.headers.get('cache-control'), 'no-store');
  });

  it('returns ECHO_TOO_MANY_KEYS when body has too many top-level keys', async () => {
    const payload: Record<string, number> = {};
    for (let i = 0; i < 40; i++) payload[`k${i}`] = i;
    const res = await fetch(`${base}/echo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    assert.equal(res.status, 422);
    const body = (await res.json()) as { error: { code: string; requestId: string } };
    assert.equal(body.error.code, 'ECHO_TOO_MANY_KEYS');
    assert.equal(typeof body.error.requestId, 'string');
    assert.equal(res.headers.get('cache-control'), 'no-store');
  });

  it('returns ECHO_STRING_TOO_LONG when a top-level string is too large', async () => {
    const res = await fetch(`${base}/echo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ note: 'x'.repeat(3000) }),
    });
    assert.equal(res.status, 422);
    const body = (await res.json()) as { error: { code: string; requestId: string; message: string } };
    assert.equal(body.error.code, 'ECHO_STRING_TOO_LONG');
    assert.match(body.error.message, /note/);
    assert.equal(typeof body.error.requestId, 'string');
    assert.equal(res.headers.get('cache-control'), 'no-store');
  });

  it('rate-limits repeated non-health requests', async () => {
    let finalStatus = 0;
    let finalBody: { error?: { code?: string; requestId?: string } } = {};
    let retryAfter = '';
    for (let i = 0; i < 24; i++) {
      const res = await fetch(`${base}/missing`);
      finalStatus = res.status;
      if (res.status === 429) {
        finalBody = (await res.json()) as { error: { code: string; requestId: string } };
        retryAfter = res.headers.get('retry-after') ?? '';
        break;
      }
    }
    assert.equal(finalStatus, 429);
    assert.equal(finalBody.error?.code, 'RATE_LIMITED');
    assert.equal(typeof finalBody.error?.requestId, 'string');
    assert.match(retryAfter, /^\d+$/);
    const limitedRes = await fetch(`${base}/missing`);
    if (limitedRes.status === 429) {
      assert.equal(limitedRes.headers.get('cache-control'), 'no-store');
    }
  });

  it('keeps health endpoints available after rate limit is hit', async () => {
    let limited = false;
    for (let i = 0; i < 24; i++) {
      const res = await fetch(`${base}/missing`);
      if (res.status === 429) {
        limited = true;
        break;
      }
    }
    assert.equal(limited, true);
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    const live = await fetch(`${base}/live`);
    assert.equal(live.status, 200);
    const ready = await fetch(`${base}/ready`);
    assert.equal(ready.status, 200);
  });

  it('allows requests again after limiter window elapses', async () => {
    for (let i = 0; i < 24; i++) {
      const res = await fetch(`${base}/missing`);
      if (res.status === 429) break;
    }
    await new Promise((resolve) => setTimeout(resolve, 160));
    const res = await fetch(`${base}/missing`);
    assert.equal(res.status, 404);
  });
});
