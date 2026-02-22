/**
 * Research API Routes
 * GET  /api/research/:playerName?prop=points
 * POST /api/research/generate
 */
import express, { Request, Response } from 'express';
import axios from 'axios';
import { scrapePlayerMentions } from '../../services/research/scraper';
import { analyzeSentiment } from '../../services/research/sentiment';
import { generateReport, getCachedReport } from '../../services/research/synthesizer';

export const researchRouter = express.Router();

const NBA_API_KEY = process.env.VITE_NBA_API_KEY || process.env.NBA_API_KEY;

async function fetchPlayerStats(playerName: string): Promise<Record<string, unknown>> {
  try {
    const searchRes = await axios.get('https://api.balldontlie.io/v1/players', {
      params: { search: playerName, per_page: 1 },
      headers: { Authorization: NBA_API_KEY },
      timeout: 8000,
    });
    const player = searchRes.data?.data?.[0];
    if (!player) return {};

    const statsRes = await axios.get('https://api.balldontlie.io/v1/season_averages', {
      params: { player_id: player.id, season: 2024 },
      headers: { Authorization: NBA_API_KEY },
      timeout: 8000,
    });
    return statsRes.data?.data?.[0] || {};
  } catch {
    return {};
  }
}

// GET /api/research/:playerName — get (or generate) research report
researchRouter.get('/:playerName', async (req: Request, res: Response) => {
  const { playerName } = req.params;
  const prop = (req.query.prop as string) || 'points';
  const forceRefresh = req.query.refresh === 'true';

  if (!forceRefresh) {
    const cached = getCachedReport(playerName, prop);
    if (cached) return res.json({ ...cached, cached: true });
  }

  try {
    const [mentions, stats] = await Promise.all([
      scrapePlayerMentions(playerName),
      fetchPlayerStats(playerName),
    ]);
    const sentiment = analyzeSentiment(mentions);
    const report = await generateReport(playerName, prop, mentions, sentiment, stats);
    res.json({ ...report, cached: false });
  } catch (err) {
    console.error('[research] Error generating report:', err);
    res.status(500).json({ error: 'Failed to generate research report' });
  }
});

// POST /api/research/generate — generate report with custom data
researchRouter.post('/generate', async (req: Request, res: Response) => {
  const { playerName, prop = 'points' } = req.body;
  if (!playerName) return res.status(400).json({ error: 'playerName is required' });

  try {
    const [mentions, stats] = await Promise.all([
      scrapePlayerMentions(playerName),
      fetchPlayerStats(playerName),
    ]);
    const sentiment = analyzeSentiment(mentions);
    const report = await generateReport(playerName, prop, mentions, sentiment, stats);
    res.json(report);
  } catch (err) {
    console.error('[research] Error generating report:', err);
    res.status(500).json({ error: 'Failed to generate research report' });
  }
});
