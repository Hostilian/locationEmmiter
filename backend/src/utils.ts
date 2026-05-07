import express from 'express';

export function requestIdFromResponse(res: express.Response): string {
  const header = res.getHeader('x-request-id');
  return typeof header === 'string' && header.length > 0 ? header : 'unknown';
}

export function sendError(
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
