/**
 * predict.ts — serverless function for /api/predict
 * GET /api/predict?p1=<id>&p2=<id>&home=<1|2>&season=2025
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';
import { predictHandler } from './_handlers/predict.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  return predictHandler(req, res);
}
