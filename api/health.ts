import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, VERSION } from './_lib.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  res.json({
    status:    'ok',
    version:   VERSION,
    timestamp: new Date().toISOString(),
    uptime:    process.uptime(),
  });
}
