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

    // Pass the prop name through — fetchStatContext resolves it via PROP_STAT.
    // StatKey accepts short keys; map long names for the adapter.
    const PROP_TO_STAT: Record<string, StatKey> = {
      points: 'pts', rebounds: 'reb', assists: 'ast', threes: 'fg3m',
      pts: 'pts', reb: 'reb', ast: 'ast', fg3m: 'fg3m', pra: 'pra',
    };
    const statKey: StatKey = PROP_TO_STAT[prop] ?? 'pts';

    const league = (req.query.league as string) || 'nba';
    const [mentions, statContext] = await Promise.all([
      scrapePlayerMentions(playerName),
      AdapterFactory.get(league).playerStats(playerName, statKey),
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
