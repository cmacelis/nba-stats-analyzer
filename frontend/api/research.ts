import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  // Base path /api/research with no subpath - could be research data request or invalid
  // For now, treat as not found since the real routes are /api/research/:playerName and /api/research/generate
  return res.status(404).json({ error: 'Not found' });
}
