/**
 * Research API Routes
 * GET  /api/research/:playerName?prop=points
 * POST /api/research/generate
 */
import express, { Request, Response } from 'express';
import axios from 'axios';
import { scrapePlayerMentions } from '../../services/research/scraper';
import { analyzeSentiment } from '../../services/research/sentiment';
import { generateReport, getCachedReport, StatContext } from '../../services/research/synthesizer';

export const researchRouter = express.Router();

const BDL_KEY = process.env.BALL_DONT_LIE_API_KEY;
const BDL_BASE = 'https://api.balldontlie.io/v1';
const BDL_SEASON = 2024;

// Map prop type to BDL game-log stat key
const PROP_STAT: Record<string, 'pts' | 'reb' | 'ast'> = {
  points:   'pts',
  rebounds: 'reb',
  assists:  'ast',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseMins(min: string | number): number {
  if (typeof min === 'number') return min;
  const parts = String(min || '0').split(':');
  return parseInt(parts[0]) + (parseInt(parts[1] || '0') / 60);
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function calcStreak(games: number[], line: number): number {
  if (games.length === 0) return 0;
  const dir = games[0] > line ? 1 : games[0] < line ? -1 : 0;
  if (dir === 0) return 0;
  let streak = 0;
  for (const g of games) {
    if ((dir > 0 && g > line) || (dir < 0 && g < line)) {
      streak += dir;
    } else {
      break;
    }
  }
  return streak;
}

// ── BDL Fetcher ───────────────────────────────────────────────────────────────

async function fetchStatContext(
  playerName: string,
  propType: string
): Promise<StatContext | null> {
  try {
    // 1. Find player ID (BDL search only matches single token — use first name)
    const firstName = playerName.split(' ')[0];
    const searchRes = await axios.get(`${BDL_BASE}/players`, {
      params: { search: firstName, per_page: 10 },
      headers: { Authorization: BDL_KEY },
      timeout: 8000,
    });
    const candidates: Array<{ id: number; first_name: string; last_name: string }> =
      searchRes.data?.data ?? [];
    const lower = playerName.toLowerCase();
    const player =
      candidates.find(p => `${p.first_name} ${p.last_name}`.toLowerCase() === lower) ??
      candidates[0];
    if (!player) return null;

    const playerId = player.id;

    // 2. Season averages + last 15 game logs in parallel
    const [avgRes, logsRes] = await Promise.all([
      axios.get(`${BDL_BASE}/season_averages`, {
        params: { player_id: playerId, season: BDL_SEASON },
        headers: { Authorization: BDL_KEY },
        timeout: 8000,
      }),
      axios.get(`${BDL_BASE}/stats`, {
        params: {
          'player_ids[]': playerId,
          'seasons[]': BDL_SEASON,
          per_page: 15,
          sort: 'date',
          direction: 'desc',
        },
        headers: { Authorization: BDL_KEY },
        timeout: 10000,
      }),
    ]);

    const avgRow = avgRes.data?.data?.[0];
    if (!avgRow) return null;

    // 3. Determine which stat to use
    const statKey = PROP_STAT[propType];
    let seasonAvg: number;

    if (propType === 'combined') {
      seasonAvg = (Number(avgRow.pts) || 0) + (Number(avgRow.reb) || 0) + (Number(avgRow.ast) || 0);
    } else if (statKey) {
      seasonAvg = Number(avgRow[statKey]) || 0;
    } else {
      return null;
    }

    // 4. Filter game logs: exclude DNP / garbage time (< 10 min played)
    const rawLogs: Array<Record<string, unknown>> = logsRes.data?.data ?? [];
    const values: number[] = rawLogs
      .filter(g => parseMins(g.min as string | number) >= 10)
      .slice(0, 10)
      .map(g => {
        if (propType === 'combined') {
          return (Number(g.pts) || 0) + (Number(g.reb) || 0) + (Number(g.ast) || 0);
        }
        return Number(g[statKey]) || 0;
      });

    if (values.length < 3) return null;

    const recentAvg5  = values.slice(0, 5).reduce((a, b) => a + b, 0) / Math.min(5, values.length);
    const recentAvg10 = values.reduce((a, b) => a + b, 0) / values.length;
    const overHitRate = values.filter(v => v > seasonAvg).length / values.length;

    return {
      propLine:    Math.round(seasonAvg * 10) / 10,
      recentAvg5:  Math.round(recentAvg5  * 10) / 10,
      recentAvg10: Math.round(recentAvg10 * 10) / 10,
      stdDev:      Math.round(stdDev(values) * 10) / 10,
      overHitRate: Math.round(overHitRate * 100) / 100,
      streak:      calcStreak(values, seasonAvg),
      recentGames: values,
      gamesPlayed: Number(avgRow.games_played) || values.length,
    };
  } catch (err) {
    console.error('[research] fetchStatContext error:', (err as Error).message);
    return null;
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

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
    const [mentions, statContext] = await Promise.all([
      scrapePlayerMentions(playerName),
      fetchStatContext(playerName, prop),
    ]);
    const sentiment = analyzeSentiment(mentions);
    const report = await generateReport(playerName, prop, mentions, sentiment, statContext);
    res.json({ ...report, statContext, cached: false });
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
    const [mentions, statContext] = await Promise.all([
      scrapePlayerMentions(playerName),
      fetchStatContext(playerName, prop),
    ]);
    const sentiment = analyzeSentiment(mentions);
    const report = await generateReport(playerName, prop, mentions, sentiment, statContext);
    res.json({ ...report, statContext });
  } catch (err) {
    console.error('[research] Error generating report:', err);
    res.status(500).json({ error: 'Failed to generate research report' });
  }
});
