/**
 * predict.ts handler — GET /api/predict?p1=<id>&p2=<id>&home=<1|2>&season=2025
 * Simplified placeholder for Phase 3 deployment
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return a placeholder response
  return res.status(200).json({
    message: 'Predict endpoint is temporarily simplified for Phase 3 deployment',
    team1WinProbability: 0.5,
    projectedScore1: 105,
    projectedScore2: 102,
    factors: [],
    timestamp: new Date().toISOString()
  });
}