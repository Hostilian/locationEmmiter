# Backend Blueprint

This directory contains a minimal backend scaffold intended for production hardening.

## Scope
- Node.js + TypeScript service with explicit health probes.
- Request validation via schema guards.
- Security headers and strict JSON request size limits.
- Structured error payloads with no stack traces in production responses.
- Request correlation (`x-request-id`) and baseline per-IP rate limiting for non-health endpoints.
- Optional strict CORS via `CORS_ORIGIN`.

## Runtime environment variables
- `PORT` (default: `8080`)
- `NODE_ENV` (`production` hides internal error details in API responses)
- `CORS_ORIGIN` (single allowed origin; mismatches are rejected with `CORS_ORIGIN_DENIED`)
- `RATE_LIMIT_WINDOW_MS` (default: `60000`)
- `RATE_LIMIT_MAX` (default: `120`)
- `ECHO_MAX_KEYS` (default: `32`; max top-level keys accepted by `/echo`)
- `ECHO_MAX_STRING_LENGTH` (default: `2048`; max length per top-level string field in `/echo`)

## Proposed Layout
- `src/server.ts` entrypoint
- `src/routes/health.ts` liveness/readiness endpoints
- `src/middleware/security.ts` security headers and request hardening
- `src/middleware/errors.ts` centralized error normalization

## Contract Alignment
The service should consume and validate packet payloads using contracts shared from:
- `shared/packet`
- `shared/mesh`

This keeps browser/mobile ingest behavior and backend decode behavior aligned.
