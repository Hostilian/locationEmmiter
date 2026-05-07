import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'location-emitter-backend' });
});

healthRouter.get('/live', (_req, res) => {
  res.status(200).json({ ok: true });
});

healthRouter.get('/ready', (_req, res) => {
  res.status(200).json({ ok: true });
});
