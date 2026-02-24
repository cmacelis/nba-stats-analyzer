import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  getCachedReport,
  fetchStatContext,
  scrapePlayerMentions,
  analyzeSentiment,
  generateReport,
} from '../_lib.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  const playerName   = req.query.playerName as string;
  const prop         = (req.query.prop as string) || 'points';
  const forceRefresh = req.query.refresh === 'true';

  if (!forceRefresh) {
    const cached = getCachedReport(playerName, prop);
    if (cached) return res.json({ ...cached, cached: true });
  }

  try {
    const [mentions, statContext] = await Promise.all([
      scrapePlayerMentions(playerName),
      fetchStatContext(playerName, prop),
    ]);
    const sentiment = analyzeSentiment(mentions);
    const report    = await generateReport(playerName, prop, mentions, sentiment, statContext);
    res.json({ ...report, statContext, cached: false });
  } catch (err) {
    console.error('[research] error:', err);
    res.status(500).json({ error: 'Failed to generate research report' });
  }
}
