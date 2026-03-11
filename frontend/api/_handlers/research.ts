/**
 * research.ts handler — GET /api/research/:playerName
 * Get research report for a player (predictions + sentiment + analysis)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getCachedReport,
  scrapePlayerMentions,
  analyzeSentiment,
  generateReport,
} from '../_lib.js';
import { AdapterFactory } from '../_adapters/AdapterFactory.js';
import type { StatKey } from '../../frontend/src/adapters/types.js';

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

    // Pass the original prop name ('points', 'rebounds', 'assists') — fetchStatContext
    // accepts both long and short keys via PROP_STAT.
    const statKey: StatKey = prop === 'pra' ? 'pra' : 'pts';

    const league = (req.query.league as string) || 'nba';
    const [mentions, statContext] = await Promise.all([
      scrapePlayerMentions(playerName),
      AdapterFactory.get(league).playerStats(playerName, statKey),
    ]);
    const sentiment = analyzeSentiment(mentions);
    const report    = await generateReport(playerName, prop, mentions, sentiment, statContext);
    res.json({ ...report, statContext, cached: false, _v: 'fb345e9+prop-fix' });
  } catch (err) {
    console.error('[research] error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate research report', detail: String(err) });
    }
  }
}
