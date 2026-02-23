/**
 * api/index.ts — Vercel serverless handler
 *
 * Serves all /api/* routes consumed by the frontend.
 * Vercel auto-routes requests matching /api/* to this file.
 *
 * ⚠️  Never use VITE_* env vars here — they are baked into the frontend
 *     bundle at build time and are NOT available in the serverless runtime.
 *     Use raw process.env.* names (e.g. BALL_DONT_LIE_API_KEY).
 */

import express from 'express';
import cors from 'cors';
import type { Request, Response } from 'express';
import axios from 'axios';

const app = express();

const BDL_KEY    = process.env.BALL_DONT_LIE_API_KEY;
const BDL_BASE   = 'https://api.balldontlie.io/v1';
const BDL_SEASON = 2024;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

// ── CORS ──────────────────────────────────────────────────────────────────────

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

app.use(cors({ origin: allowedOrigins, methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }));
app.use(express.json());

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// ── Players ───────────────────────────────────────────────────────────────────

app.get('/api/players', async (req: Request, res: Response) => {
  const searchTerm = (req.query.search as string) || '';
  try {
    const firstName = searchTerm.split(' ')[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await axios.get<{ data: any[] }>(`${BDL_BASE}/players`, {
      params: { search: firstName, per_page: 25 },
      headers: { Authorization: BDL_KEY },
    });
    const allPlayers = response.data?.data ?? [];
    const isFullName = searchTerm.includes(' ');
    const lower = searchTerm.toLowerCase();
    const filtered = isFullName
      ? allPlayers.filter(
          (p: { first_name: string; last_name: string }) =>
            `${p.first_name} ${p.last_name}`.toLowerCase() === lower
        )
      : allPlayers;
    res.json({ ...response.data, data: filtered });
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any;
    if (err.response?.status === 401) {
      res.status(402).json({ error: 'plan_required', message: 'Player search requires a valid BallDontLie API key.' });
    } else {
      res.status(err.response?.status || 500).json({ error: 'Failed to fetch player data' });
    }
  }
});

// NOTE: /compare/:id1/:id2 must come BEFORE /:id/stats to prevent route shadowing
app.get('/api/players/compare/:id1/:id2', async (req: Request, res: Response) => {
  const { id1, id2 } = req.params;
  const season = parseInt(req.query.season as string) || 2024;
  try {
    const [stats1, stats2] = await Promise.all([
      axios.get(`${BDL_BASE}/season_averages`, {
        params: { player_id: parseInt(id1), season },
        headers: { Authorization: BDL_KEY },
      }),
      axios.get(`${BDL_BASE}/season_averages`, {
        params: { player_id: parseInt(id2), season },
        headers: { Authorization: BDL_KEY },
      }),
    ]);
    res.json({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      player1: (stats1.data as any).data[0] || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      player2: (stats2.data as any).data[0] || null,
      head_to_head: [],
    });
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any;
    if (err.response?.status === 401) {
      res.status(402).json({ error: 'plan_required', message: 'Season stats require a BallDontLie Starter plan.' });
    } else {
      res.status(500).json({ error: 'Failed to fetch comparison data' });
    }
  }
});

app.get('/api/players/:id/stats', async (req: Request, res: Response) => {
  const season = parseInt(req.query.season as string) || 2024;
  try {
    const response = await axios.get(`${BDL_BASE}/season_averages`, {
      params: { player_id: parseInt(req.params.id), season },
      headers: { Authorization: BDL_KEY },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.json((response.data as any).data[0] || {});
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any;
    if (err.response?.status === 401) {
      res.status(402).json({ error: 'plan_required', message: 'Season stats require a BallDontLie Starter plan.' });
    } else {
      res.status(500).json({ error: 'Failed to fetch player stats' });
    }
  }
});

// ── Games ─────────────────────────────────────────────────────────────────────

app.get('/api/games', async (_req: Request, res: Response) => {
  const today = new Date();
  const end = new Date(today);
  end.setDate(today.getDate() + 3);
  const fmt = (d: Date): string => d.toISOString().slice(0, 10);
  try {
    const response = await axios.get(`${BDL_BASE}/games`, {
      params: { start_date: fmt(today), end_date: fmt(end), per_page: 25 },
      headers: { Authorization: BDL_KEY },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const games = ((response.data as any).data ?? []).filter((g: any) => g.status !== 'Final');
    res.json({ data: games });
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any;
    res.status(err.response?.status ?? 500).json({ error: 'Failed to fetch games' });
  }
});

// ── Research (inlined — cannot import from backend/src/ at serverless build time) ──

// --- Types ---

interface StatContext {
  propLine:    number;
  recentAvg5:  number;
  recentAvg10: number;
  stdDev:      number;
  overHitRate: number;
  streak:      number;
  recentGames: number[];
  gamesPlayed: number;
}

interface SocialMention {
  content:   string;
  source:    'reddit' | 'espn';
  url:       string;
  timestamp: Date;
  score?:    number;
}

interface SentimentScore {
  overall_score:   number;
  volume:          number;
  keywords:        string[];
  bullish_signals: number;
  bearish_signals: number;
}

interface ResearchReport {
  playerName:     string;
  propType:       string;
  prediction:     'over' | 'under' | 'neutral';
  confidence:     number;
  reasoning:      string;
  keyFactors:     string[];
  sentimentWeight: string;
  statWeight:     string;
  generatedAt:    Date;
  expiresAt:      Date;
  simulated:      boolean;
}

// --- In-memory cache (15-min TTL) ---

interface CacheEntry { report: ResearchReport; expiresAt: number; }
const reportCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000;

function cacheKey(name: string, prop: string) { return `${name.toLowerCase()}:${prop}`; }

function getCachedReport(name: string, prop: string): ResearchReport | null {
  const entry = reportCache.get(cacheKey(name, prop));
  return entry && entry.expiresAt > Date.now() ? entry.report : null;
}

function setCachedReport(name: string, prop: string, report: ResearchReport) {
  reportCache.set(cacheKey(name, prop), { report, expiresAt: Date.now() + CACHE_TTL_MS });
}

// --- Stat helpers ---

const PROP_STAT: Record<string, 'pts' | 'reb' | 'ast'> = {
  points:   'pts',
  rebounds: 'reb',
  assists:  'ast',
};

function parseMins(min: string | number): number {
  if (typeof min === 'number') return min;
  const parts = String(min || '0').split(':');
  return parseInt(parts[0]) + (parseInt(parts[1] || '0') / 60);
}

function calcStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
}

function calcStreak(games: number[], line: number): number {
  if (games.length === 0) return 0;
  const dir = games[0] > line ? 1 : games[0] < line ? -1 : 0;
  if (dir === 0) return 0;
  let streak = 0;
  for (const g of games) {
    if ((dir > 0 && g > line) || (dir < 0 && g < line)) streak += dir;
    else break;
  }
  return streak;
}

async function fetchStatContext(playerName: string, propType: string): Promise<StatContext | null> {
  try {
    const firstName = playerName.split(' ')[0];
    const searchRes = await axios.get(`${BDL_BASE}/players`, {
      params: { search: firstName, per_page: 10 },
      headers: { Authorization: BDL_KEY },
      timeout: 8000,
    });
    const candidates: Array<{ id: number; first_name: string; last_name: string }> =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (searchRes.data as any)?.data ?? [];
    const lower = playerName.toLowerCase();
    const player =
      candidates.find(p => `${p.first_name} ${p.last_name}`.toLowerCase() === lower) ??
      candidates[0];
    if (!player) return null;

    const [avgRes, logsRes] = await Promise.all([
      axios.get(`${BDL_BASE}/season_averages`, {
        params: { player_id: player.id, season: BDL_SEASON },
        headers: { Authorization: BDL_KEY },
        timeout: 8000,
      }),
      axios.get(`${BDL_BASE}/stats`, {
        params: {
          'player_ids[]': player.id,
          'seasons[]': BDL_SEASON,
          per_page: 15,
          sort: 'date',
          direction: 'desc',
        },
        headers: { Authorization: BDL_KEY },
        timeout: 10000,
      }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const avgRow = (avgRes.data as any)?.data?.[0];
    if (!avgRow) return null;

    const statKey = PROP_STAT[propType];
    let seasonAvg: number;
    if (propType === 'combined') {
      seasonAvg = (Number(avgRow.pts) || 0) + (Number(avgRow.reb) || 0) + (Number(avgRow.ast) || 0);
    } else if (statKey) {
      seasonAvg = Number(avgRow[statKey]) || 0;
    } else {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawLogs: Array<Record<string, unknown>> = (logsRes.data as any)?.data ?? [];
    const values: number[] = rawLogs
      .filter(g => parseMins(g['min'] as string | number) >= 10)
      .slice(0, 10)
      .map(g => {
        if (propType === 'combined') {
          return (Number(g['pts']) || 0) + (Number(g['reb']) || 0) + (Number(g['ast']) || 0);
        }
        return Number(g[statKey!]) || 0;
      });

    if (values.length < 3) return null;

    const recentAvg5  = values.slice(0, 5).reduce((a, b) => a + b, 0) / Math.min(5, values.length);
    const recentAvg10 = values.reduce((a, b) => a + b, 0) / values.length;
    const overHitRate = values.filter(v => v > seasonAvg).length / values.length;

    return {
      propLine:    Math.round(seasonAvg   * 10) / 10,
      recentAvg5:  Math.round(recentAvg5  * 10) / 10,
      recentAvg10: Math.round(recentAvg10 * 10) / 10,
      stdDev:      Math.round(calcStdDev(values) * 10) / 10,
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

// --- Sentiment (keyword-based) ---

const BULLISH = ['hot','fire','beast','dominant','mvp','unstoppable','lock','elite','bucket',
  'clutch','healthy','motivated','rolling','streak','strong','consistent','efficient',
  'explosion','dropped','killing'];
const BEARISH = ['injury','injured','hurt','questionable','doubtful','out','miss','slumping',
  'cold','struggling','bench','rest','limited','suspension','inconsistent','slow',
  'tired','dnp','trade','frustration'];

async function scrapePlayerMentions(playerName: string): Promise<SocialMention[]> {
  const [reddit, espn] = await Promise.allSettled([
    (async (): Promise<SocialMention[]> => {
      const q = encodeURIComponent(`${playerName} NBA`);
      const res = await axios.get(
        `https://www.reddit.com/search.json?q=${q}&sort=new&limit=25&t=week`,
        { headers: { 'User-Agent': 'NBA-Research-Bot/1.0' }, timeout: 8000 }
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const posts: any[] = res.data?.data?.children || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return posts.filter((p: any) => {
        const sub: string = (p.data?.subreddit || '').toLowerCase();
        return sub.includes('nba') || sub.includes('basketball');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }).map((p: any): SocialMention => ({
        content:   `${p.data.title} ${p.data.selftext || ''}`.slice(0, 300),
        source:    'reddit',
        url:       `https://reddit.com${p.data.permalink}`,
        timestamp: new Date(p.data.created_utc * 1000),
        score:     p.data.score,
      }));
    })(),
    (async (): Promise<SocialMention[]> => {
      const res = await axios.get(
        'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news',
        { params: { limit: 20 }, timeout: 8000 }
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const articles: any[] = res.data?.articles || [];
      const parts = playerName.toLowerCase().split(' ');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return articles.filter((a: any) => {
        const text = `${a.headline} ${a.description || ''}`.toLowerCase();
        return parts.every((p: string) => text.includes(p));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }).map((a: any): SocialMention => ({
        content:   `${a.headline}: ${a.description || ''}`.slice(0, 300),
        source:    'espn',
        url:       a.links?.web?.href || '',
        timestamp: new Date(a.published || Date.now()),
      }));
    })(),
  ]);
  const all: SocialMention[] = [
    ...(reddit.status === 'fulfilled' ? reddit.value : []),
    ...(espn.status   === 'fulfilled' ? espn.value   : []),
  ];
  return all.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 30);
}

function analyzeSentiment(mentions: SocialMention[]): SentimentScore {
  if (mentions.length === 0) {
    return { overall_score: 0, volume: 0, keywords: [], bullish_signals: 0, bearish_signals: 0 };
  }
  let bull = 0, bear = 0;
  for (const m of mentions) {
    const text = m.content.toLowerCase();
    const w = m.score ? Math.min(1 + Math.log10(m.score + 1) * 0.3, 2) : 1;
    for (const kw of BULLISH) { if (text.includes(kw)) bull += w; }
    for (const kw of BEARISH)  { if (text.includes(kw)) bear += w; }
  }
  const total = bull + bear;
  const allWords = mentions.map(m => m.content).join(' ')
    .toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/);
  const freq = new Map<string, number>();
  for (const w of allWords) {
    if ([...BULLISH, ...BEARISH].includes(w)) freq.set(w, (freq.get(w) || 0) + 1);
  }
  const keywords = [...freq.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w]) => w);
  return {
    overall_score:   total > 0 ? Math.max(-1, Math.min(1, (bull - bear) / total)) : 0,
    volume:          mentions.length,
    keywords,
    bullish_signals: Math.round(bull),
    bearish_signals: Math.round(bear),
  };
}

// --- AI synthesis helpers ---

function r1(n: number) { return Math.round(n * 10) / 10; }
function sign(n: number) { return n >= 0 ? `+${r1(n)}` : `${r1(n)}`; }
function consistencyLabel(sd: number) {
  if (sd < 3)  return 'very consistent';
  if (sd < 5)  return 'consistent';
  if (sd < 7)  return 'moderate variance';
  if (sd < 10) return 'high variance';
  return 'very high variance';
}
function streakLabel(s: number) {
  if (s === 0) return 'No active streak';
  return `${Math.abs(s)} consecutive ${s > 0 ? 'OVER' : 'UNDER'}s`;
}

function simulatedReport(
  playerName: string, propType: string,
  sentiment: SentimentScore | null, ctx: StatContext | null
): ResearchReport {
  let prediction: 'over' | 'under' | 'neutral' = 'neutral';
  let confidence = 0.50;
  if (ctx && ctx.gamesPlayed >= 5) {
    const delta5  = ctx.recentAvg5 - ctx.propLine;
    const hitRate = ctx.overHitRate;
    if (delta5 > 1.5 && hitRate >= 0.6) {
      prediction = 'over';
      confidence = Math.min(0.72, 0.55 + Math.abs(delta5) * 0.03 + (hitRate - 0.5) * 0.3);
    } else if (delta5 < -1.5 && hitRate <= 0.4) {
      prediction = 'under';
      confidence = Math.min(0.72, 0.55 + Math.abs(delta5) * 0.03 + (0.5 - hitRate) * 0.3);
    } else {
      const score = sentiment?.overall_score ?? 0;
      if (Math.abs(score) > 0.15) {
        prediction = score > 0 ? 'over' : 'under';
        confidence = 0.50 + Math.abs(score) * 0.15;
      }
    }
    if (ctx.stdDev > 7) confidence = Math.max(0.45, confidence - 0.08);
  } else {
    const score = sentiment?.overall_score ?? 0;
    if (Math.abs(score) > 0.15) {
      prediction = score > 0 ? 'over' : 'under';
      confidence = 0.50 + Math.abs(score) * 0.2;
    }
  }
  const now = new Date();
  const keyFactors: string[] = ctx ? [
    `L5 avg: ${r1(ctx.recentAvg5)} vs line ${r1(ctx.propLine)} (${sign(ctx.recentAvg5 - ctx.propLine)})`,
    `Over hit rate L10: ${Math.round(ctx.overHitRate * 100)}%`,
    `Consistency: ${consistencyLabel(ctx.stdDev)} (σ=${r1(ctx.stdDev)})`,
    streakLabel(ctx.streak),
  ] : [];
  return {
    playerName, propType,
    prediction, confidence,
    reasoning: ctx
      ? `Simulated: L5 avg ${r1(ctx.recentAvg5)} vs line ${r1(ctx.propLine)} (${sign(ctx.recentAvg5 - ctx.propLine)}), hit rate ${Math.round(ctx.overHitRate * 100)}% over last 10.`
      : `Simulated: insufficient data for ${playerName} ${propType}.`,
    keyFactors,
    sentimentWeight: 'Low (10%)',
    statWeight:      'Primary (90%)',
    generatedAt: now,
    expiresAt:   new Date(now.getTime() + 24 * 60 * 60 * 1000),
    simulated: true,
  };
}

async function callClaude(prompt: string): Promise<string | null> {
  if (!ANTHROPIC_KEY) return null;
  try {
    const res = await axios.post(
      'https://api.anthropic.com/v1/messages',
      { model: 'claude-sonnet-4-6', max_tokens: 1024, messages: [{ role: 'user', content: prompt }] },
      {
        headers: {
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        timeout: 30000,
      }
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const block = (res.data as any)?.content?.[0];
    return block?.type === 'text' ? block.text : null;
  } catch (err) {
    console.error('[research] Claude API error:', (err as Error).message);
    return null;
  }
}

async function generateReport(
  playerName: string, propType: string,
  mentions: SocialMention[], sentiment: SentimentScore | null, ctx: StatContext | null
): Promise<ResearchReport> {
  const cached = getCachedReport(playerName, propType);
  if (cached) return cached;

  let report: ResearchReport;

  const buildFullPrompt = (): string => {
    if (!ctx || ctx.gamesPlayed < 3) {
      const sentimentText = sentiment
        ? `Score: ${(sentiment.overall_score * 100).toFixed(0)}% positive | Volume: ${sentiment.volume}`
        : 'No sentiment data';
      return `You are an expert NBA prop analyst.\nPlayer: ${playerName} | Prop: ${propType}\nInsufficient recent game data. Social sentiment: ${sentimentText}\nRespond ONLY with valid JSON:\n{"prediction":"neutral","confidence":40,"reasoning":"Insufficient data.","key_factors":["No recent game data"],"sentiment_weight":"N/A","stat_weight":"N/A"}`;
    }
    const delta5  = r1(ctx.recentAvg5  - ctx.propLine);
    const delta10 = r1(ctx.recentAvg10 - ctx.propLine);
    const gameResultLine = ctx.recentGames.slice(0, 10).map(v => {
      const d = v - ctx.propLine;
      return `${v}${Math.abs(d) < 0.5 ? '=' : d > 0 ? '↑' : '↓'}`;
    }).join(', ');
    const sentimentText = sentiment
      ? `Score: ${(sentiment.overall_score * 100).toFixed(0)}% | Volume: ${sentiment.volume} | Keywords: ${sentiment.keywords.join(', ')}`
      : 'No sentiment data';
    const topMentions = mentions.slice(0, 5).map(m => `- ${m.content} (${m.source})`).join('\n');
    return `You are an expert NBA prop betting analyst focused on finding edges.\nPlayer: ${playerName} | Prop: ${propType} | Line: ${r1(ctx.propLine)}\nLast 10 games: ${gameResultLine}\nOver hit rate L10: ${Math.round(ctx.overHitRate * 100)}% | L5 avg: ${r1(ctx.recentAvg5)} (${sign(delta5)}) | L10 avg: ${r1(ctx.recentAvg10)} (${sign(delta10)})\nStd dev: ${r1(ctx.stdDev)} (${consistencyLabel(ctx.stdDev)}) | Streak: ${streakLabel(ctx.streak)}\nSentiment: ${sentimentText}\n${topMentions}\nRespond ONLY with valid JSON:\n{"prediction":"over"|"under"|"neutral","confidence":0-100,"reasoning":"<2-3 sentences>","key_factors":["..."],"sentiment_weight":"<e.g. Low (10%)>","stat_weight":"<e.g. Primary (90%)>"}`;
  };

  const text = await callClaude(buildFullPrompt());
  if (!text) {
    report = simulatedReport(playerName, propType, sentiment, ctx);
  } else {
    try {
      const match = text.match(/\{[\s\S]*\}/);
      const json = JSON.parse(match ? match[0] : text);
      const now = new Date();
      report = {
        playerName, propType,
        prediction: json.prediction || 'neutral',
        confidence: Math.min(1, (json.confidence || 50) / 100),
        reasoning:  json.reasoning || 'Analysis unavailable',
        keyFactors: json.key_factors || [],
        sentimentWeight: json.sentiment_weight || 'Low (10%)',
        statWeight:      json.stat_weight      || 'Primary (90%)',
        generatedAt: now,
        expiresAt:   new Date(now.getTime() + 24 * 60 * 60 * 1000),
        simulated: false,
      };
    } catch {
      report = simulatedReport(playerName, propType, sentiment, ctx);
    }
  }

  setCachedReport(playerName, propType, report);
  return report;
}

// --- Research routes ---

// GET /api/research/:playerName?prop=points
app.get('/api/research/:playerName', async (req: Request, res: Response) => {
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

// POST /api/research/generate
app.post('/api/research/generate', async (req: Request, res: Response) => {
  const { playerName, prop = 'points' } = req.body as { playerName?: string; prop?: string };
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

// ── Export for Vercel ─────────────────────────────────────────────────────────

export default app;
