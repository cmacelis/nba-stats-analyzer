import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply CORS
  if (applyCors(req, res)) return;

  return res.status(200).json({ 
    message: 'Test notifications endpoint works!',
    path: req.url,
    method: req.method
  });
}