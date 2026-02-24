import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  getCachedReport,
  fetchStatContext,
  scrapePlayerMentions,
  analyzeSentiment,
  generateReport,
} from '../_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Wrap everything — including pre-try code — so any throw returns JSON, not Vercel's error page
  try {
    if (applyCors(req, res)) return;

    const playerName = req.query.playerName as string | undefined;
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
