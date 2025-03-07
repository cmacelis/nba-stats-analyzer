import express from 'express';
import type { Request, Response } from 'express';

const router = express.Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export const healthRouter = router; 