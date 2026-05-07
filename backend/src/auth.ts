import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import pino from 'pino';
import type { Role } from './db/schema.js';
import { sendError } from './utils.js';

const JWT_SECRET = process.env.JWT_SECRET || 'lep-fallback-secret-2026';
const logger = pino();

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        role: Role;
      };
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Missing or invalid authorization header.');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Token not found.');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email?: string; role: Role };
    req.user = decoded;
    next();
  } catch (error) {
    // JWT verification failed (invalid signature, expired token, etc.)
    logger.debug(
      { error: error instanceof Error ? error.message : String(error) },
      'JWT verification failed'
    );
    return sendError(res, 401, 'UNAUTHORIZED', 'Invalid or expired token.');
  }
}
