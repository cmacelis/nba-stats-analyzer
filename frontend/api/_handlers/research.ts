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
import type { StatKey } from '../../src/adapters/types.js';

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

    // Map prop string to StatKey ('points' → 'pts', anything else unknown → 'pts')
    const statKey: StatKey = prop === 'pra' ? 'pra' : 'pts';

    const [mentions, statContext] = await Promise.all([
      scrapePlayerMentions(playerName),
      AdapterFactory.get('nba').playerStats(playerName, statKey),
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
