import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  
  return res.status(200).json({
    success: true,
    message: 'Test endpoint deployed successfully',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
}