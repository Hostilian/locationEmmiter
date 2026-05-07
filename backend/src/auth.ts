import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { sendError } from './utils.js';

const JWT_SECRET = process.env.JWT_SECRET || 'lep-fallback-secret-2026';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Missing or invalid authorization header.');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Token not found.');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
    req.user = decoded;
    next();
  } catch (error) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Invalid or expired token.');
  }
}
