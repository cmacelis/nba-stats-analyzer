/**
 * research.ts handler — GET /api/research/:playerName
 * Get research report for a player (predictions + sentiment + analysis)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getCachedReport,
  fetchStatContext,
  scrapePlayerMentions,
  analyzeSentiment,
  generateReport,
} from '../_lib.js';

export async function researchHandler(req: VercelRequest, res: VercelResponse, playerName: string) {
  try {
    if (!playerName) {
      return res.status(400).json({ error: 'playerName is required' });
    }

    const prop         = (req.query.prop as string) || 'points';
    const forceRefresh = req.query.refresh === 'true';

    if (!forceRefresh) {
      const cached = getCachedReport(playerName, prop);
      if (cached) return res.json({ ...cached, cached: true });
    }

    const [mentions, statContext] = await Promise.all([
      scrapePlayerMentions(playerName),
      fetchStatContext(playerName, prop),
    ]);
    const sentiment = analyzeSentiment(mentions);
    const report    = await generateReport(playerName, prop, mentions, sentiment, statContext);
    res.json({ ...report, statContext, cached: false });
  } catch (err) {
    console.error('[research] error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate research report', detail: String(err) });
    }
  }
}
