import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib.js';
import edgeHandler from '../edge.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
 if (applyCors(req, res)) return;
 if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
 // Alias: reuse the existing /api/edge handler to guarantee identical behavior
 return edgeHandler(req, res);
}
