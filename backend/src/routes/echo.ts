import { Router } from 'express';
import { z } from 'zod';
import fastJson from 'fast-json-stringify';
import { sendError } from '../utils.js';

const echoMaxTopLevelKeys = Number(process.env.ECHO_MAX_KEYS ?? 32);
const echoMaxStringLength = Number(process.env.ECHO_MAX_STRING_LENGTH ?? 2048);

const stringifyEcho = fastJson({
  title: 'EchoSchema',
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    received: { type: 'object', additionalProperties: true }
  }
});

export const echoRouter = Router();

const echoSchema = z.record(z.string(), z.any()).superRefine((val, ctx) => {
  const keys = Object.keys(val);
  if (keys.length > echoMaxTopLevelKeys) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Request body exceeds maximum top-level keys (${echoMaxTopLevelKeys}).`,
    });
    return;
  }
  for (const key of keys) {
    if (typeof val[key] === 'string' && val[key].length > echoMaxStringLength) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `String field "${key}" exceeds max length (${echoMaxStringLength}).`,
      });
    }
  }
});

echoRouter.post('/echo', (req, res) => {
  if (!req.is('application/json')) {
    sendError(res, 415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json.');
    return;
  }
  if (typeof req.body !== 'object' || req.body == null || Array.isArray(req.body)) {
    sendError(res, 422, 'INVALID_BODY', 'Request body must be a JSON object.');
    return;
  }

  const parsed = echoSchema.safeParse(req.body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const code = firstIssue.message.includes('top-level keys') 
      ? 'ECHO_TOO_MANY_KEYS' 
      : 'ECHO_STRING_TOO_LONG';
    sendError(res, 422, code, firstIssue.message);
    return;
  }

  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(stringifyEcho({ ok: true, received: req.body }));
});
