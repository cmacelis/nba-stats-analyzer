import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../_lib.js';
import {
  getCachedReport,
  scrapePlayerMentions,
  analyzeSentiment,
  generateReport,
} from '../../_lib.js';
import { AdapterFactory } from '../../_adapters/AdapterFactory.js';
import type { StatKey } from '../../_lib.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  const playerName = (req.query.playerName as string) || '';
  if (!playerName) return res.status(400).json({ error: 'playerName required' });
  
  try {
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
