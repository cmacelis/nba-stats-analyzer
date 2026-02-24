import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  fetchStatContext,
  scrapePlayerMentions,
  analyzeSentiment,
  generateReport,
} from '../_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (applyCors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { playerName, prop = 'points' } = (req.body as { playerName?: string; prop?: string }) ?? {};
    if (!playerName) return res.status(400).json({ error: 'playerName is required' });

    const [mentions, statContext] = await Promise.all([
      scrapePlayerMentions(playerName),
      fetchStatContext(playerName, prop),
    ]);
    const sentiment = analyzeSentiment(mentions);
    const report    = await generateReport(playerName, prop, mentions, sentiment, statContext);
    res.json({ ...report, statContext });
  } catch (err) {
    console.error('[research/generate] error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate research report', detail: String(err) });
    }
  }
}
