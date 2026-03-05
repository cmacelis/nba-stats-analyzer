import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateHandler } from '../../_handlers/generate.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return generateHandler(req, res);
}
