/**
 * _lib.ts — shared helpers for all /api/* serverless handlers
 *
 * ⚠️  Never use VITE_* env vars here — they are baked into the frontend
 *     bundle at build time and are NOT available in the serverless runtime.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

// ── Constants ─────────────────────────────────────────────────────────────────

export const VERSION    = '2026-02-23-research-hotfix-1';
export const BDL_BASE    = 'https://api.balldontlie.io/v1';
export const BDL_BASE_V2 = 'https://api.balldontlie.io/v2';
export const BDL_SEASON  = 2025;

const BDL_KEY       = process.env.BALL_DONT_LIE_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

// ── Tiered in-memory cache ───────────────────────────────────────────────────

interface CacheEntry<T> { data: T; expiresAt: number }
const _cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const e = _cache.get(key);
  if (!e || e.expiresAt < Date.now()) { _cache.delete(key); return null; }
  return e.data as T;
}
function setCached<T>(key: string, data: T, ttlMs: number): void {
  _cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

const CACHE_GAMES      = 60 * 60 * 1000;       // 1h
const CACHE_PROPS      = 10 * 60 * 1000;       // 10min
const CACHE_SEASON_AVG = 4 * 60 * 60 * 1000;   // 4h

// ── CORS ──────────────────────────────────────────────────────────────────────

/**
 * Apply CORS headers and handle OPTIONS preflight.
 * Returns true if the request was a preflight (caller should return immediately).
 */
export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = process.env.ALLOWED_ORIGINS?.split(',')[0]?.trim() ?? '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

// ── BDL axios helper ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function bdlGet(path: string, params: Record<string, unknown> = {}): Promise<any> {
  const res = await axios.get(`${BDL_BASE}${path}`, {
    params,
    headers: { Authorization: BDL_KEY },
    timeout: 10000,
  });
  return res.data;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function bdlGetV2(path: string, params: Record<string, unknown> = {}): Promise<any> {
  const res = await axios.get(`${BDL_BASE_V2}${path}`, {
    params,
    headers: { Authorization: BDL_KEY },
    timeout: 10000,
  });
  return res.data;
}

// ── Player lookup ─────────────────────────────────────────────────────────────

export interface BdlPlayer {
  id: number;
  first_name: string;
  last_name: string;
  position?: string;
  team?: { id: number; full_name: string; abbreviation: string };
}

/** Search by first name, then exact-match full name if a full name was given. */
export async function searchPlayers(searchTerm: string, league?: string): Promise<{ data: BdlPlayer[]; meta: unknown }> {
  const firstName = searchTerm.split(' ')[0];
  const params: Record<string, unknown> = { search: firstName, per_page: 25 };
  if (league) params.league = league;
  
  const raw = await bdlGet('/players', params);
  const allPlayers: BdlPlayer[] = raw?.data ?? [];
  const isFullName = searchTerm.includes(' ');
  const lower = searchTerm.toLowerCase();
  const filtered = isFullName
    ? allPlayers.filter(p => `${p.first_name} ${p.last_name}`.toLowerCase() === lower)
    : allPlayers;
  return { data: filtered, meta: raw?.meta };
}

/** Find a single player by full name; falls back to first result. */
async function findPlayer(name: string): Promise<BdlPlayer | null> {
  const firstName = name.split(' ')[0];
  const raw = await bdlGet('/players', { search: firstName, per_page: 10 });
  const candidates: BdlPlayer[] = raw?.data ?? [];
  const lower = name.toLowerCase();
  return candidates.find(p => `${p.first_name} ${p.last_name}`.toLowerCase() === lower)
    ?? candidates[0]
    ?? null;
}

// ── Stat context ──────────────────────────────────────────────────────────────

export interface StatContext {
  propLine:    number;
  recentAvg5:  number;
  recentAvg10: number;
  stdDev:      number;
  overHitRate: number;
  streak:      number;
  recentGames: number[];
  gamesPlayed: number;
  lineSource?: string | null;   // 'draftkings' | 'fanduel' | 'season_avg'
  overOdds?:   number | null;
  underOdds?:  number | null;
}

const PROP_STAT: Record<string, 'pts' | 'reb' | 'ast'> = {
  points:   'pts',
  rebounds: 'reb',
  assists:  'ast',
  // Adapter also passes short keys (StatKey format) — accept both
  pts: 'pts',
  reb: 'reb',
  ast: 'ast',
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
  if (!games.length) return 0;
  const dir = games[0] > line ? 1 : games[0] < line ? -1 : 0;
  if (!dir) return 0;
  let streak = 0;
  for (const g of games) {
    if ((dir > 0 && g > line) || (dir < 0 && g < line)) streak += dir;
    else break;
  }
  return streak;
}

/**
 * Fetch season averages for a player.
 * Tries /season_averages first; falls back to computing from game logs
 * so it works on BDL free plan where /season_averages may return empty.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSeasonAverages(playerId: number, season: number): Promise<Record<string, any> | null> {
  try {
    const data = await bdlGet('/season_averages', { player_id: playerId, season });
    if (data?.data?.[0]) return data.data[0];
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((err as any)?.response?.status === 401) throw err; // propagate auth errors
  }

  // Fallback: compute from game logs (free plan compatible)
  const logsData = await bdlGet('/stats', {
    'player_ids[]': playerId,
    'seasons[]': season,
    per_page: 100,
  });
  const allGames: Array<Record<string, unknown>> = logsData?.data ?? [];
  const games = allGames.filter(g => parseMins(g['min'] as string | number) >= 5);
  if (games.length < 3) return null;

  const n = games.length;
  const avgN = (key: string) =>
    Math.round((games.reduce((s, g) => s + (Number(g[key]) || 0), 0) / n) * 10) / 10;
  const sumK = (key: string) => games.reduce((s, g) => s + (Number(g[key]) || 0), 0);
  const minsAvg = games.reduce((s, g) => s + parseMins(g['min'] as string | number), 0) / n;

  return {
    player_id: playerId, season, games_played: n,
    pts: avgN('pts'), reb: avgN('reb'), ast: avgN('ast'),
    stl: avgN('stl'), blk: avgN('blk'), turnover: avgN('turnover'),
    oreb: avgN('oreb'), dreb: avgN('dreb'), pf: avgN('pf'),
    fgm: avgN('fgm'), fga: avgN('fga'), fg3m: avgN('fg3m'), fg3a: avgN('fg3a'),
    ftm: avgN('ftm'), fta: avgN('fta'),
    fg_pct:  sumK('fga')  > 0 ? Math.round((sumK('fgm')  / sumK('fga'))  * 1000) / 1000 : 0,
    fg3_pct: sumK('fg3a') > 0 ? Math.round((sumK('fg3m') / sumK('fg3a')) * 1000) / 1000 : 0,
    ft_pct:  sumK('fta')  > 0 ? Math.round((sumK('ftm')  / sumK('fta'))  * 1000) / 1000 : 0,
    min: `${Math.floor(minsAvg)}:${Math.round((minsAvg % 1) * 60).toString().padStart(2, '0')}`,
  };
}

// ── Today's games + player props (GOAT tier) ─────────────────────────────────

export interface TodayGame {
  id: number;
  date: string;
  status: string;
  home_team: { id: number; abbreviation: string; full_name: string };
  visitor_team: { id: number; abbreviation: string; full_name: string };
}

export async function getTodaysGames(): Promise<TodayGame[]> {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const ck = `games:${today}`;
  const hit = getCached<TodayGame[]>(ck);
  if (hit) return hit;

  const data = await bdlGet('/games', { 'dates[]': today, per_page: 25 });
  const games: TodayGame[] = data?.data ?? [];
  setCached(ck, games, CACHE_GAMES);
  return games;
}

export function getPlayerIdsPlayingToday(
  players: Array<{ id: number; team?: { id: number } }>,
  todaysGames: TodayGame[],
): Set<number> {
  const teamIds = new Set<number>();
  for (const g of todaysGames) {
    teamIds.add(g.home_team.id);
    teamIds.add(g.visitor_team.id);
  }
  const out = new Set<number>();
  for (const p of players) { if (p.team && teamIds.has(p.team.id)) out.add(p.id); }
  return out;
}

export interface PlayerProp {
  player_id:  number;
  vendor:     string;
  prop_type:  string;        // internal key: 'pts','reb','ast','pra', etc.
  line_value: number;
  over_odds:  number;
  under_odds: number;
}

const BDL_PROP_MAP: Record<string, string> = {
  points:   'pts',
  rebounds: 'reb',
  assists:  'ast',
  threes:   'fg3m',
  player_points_rebounds_assists: 'pra',
};

/** Vendor preference rank — lower = better.  DraftKings > FanDuel > Caesars > others */
const VENDOR_RANK: Record<string, number> = {
  draftkings: 0, fanduel: 1, caesars: 2, fanatics: 3, betmgm: 4,
};
function vendorScore(v: string): number { return VENDOR_RANK[v] ?? 99; }

export async function getPlayerProps(gameId: number): Promise<Map<string, PlayerProp>> {
  const ck = `props:${gameId}`;
  const hit = getCached<Map<string, PlayerProp>>(ck);
  if (hit) return hit;

  try {
    // BDL returns all rows regardless of per_page (tested: 2805 for one game)
    const data = await bdlGetV2('/odds/player_props', { game_id: gameId, per_page: 5000 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = data?.data ?? [];
    const m = new Map<string, PlayerProp>();
    for (const o of rows) {
      // Only accept over_under markets — skip milestone/alt lines entirely.
      // Milestone markets are "will they score ≥X?" with a single odds value,
      // not the primary sportsbook line.
      if (o.market?.type !== 'over_under') continue;

      const sk = BDL_PROP_MAP[o.prop_type];
      if (!sk) continue;

      const overOdds  = o.market?.over_odds  ?? 0;
      const underOdds = o.market?.under_odds ?? 0;
      // Must have real odds on both sides
      if (!overOdds && !underOdds) continue;

      const mk = `${o.player_id}:${sk}`;
      const existing = m.get(mk);
      // Keep entry from best-ranked vendor
      if (!existing || vendorScore(o.vendor) < vendorScore(existing.vendor)) {
        m.set(mk, {
          player_id:  o.player_id,
          vendor:     o.vendor,
          prop_type:  sk,
          line_value: parseFloat(o.line_value),
          over_odds:  overOdds,
          under_odds: underOdds,
        });
      }
    }
    setCached(ck, m, CACHE_PROPS);
    return m;
  } catch (err) {
    console.warn('[props] getPlayerProps error game', gameId, (err as Error).message);
    return new Map();
  }
}

export async function getAllTodaysProps(): Promise<Map<string, PlayerProp>> {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const ck = `allprops:${today}`;
  const hit = getCached<Map<string, PlayerProp>>(ck);
  if (hit) return hit;

  const games = await getTodaysGames();
  if (games.length === 0) return new Map();

  const maps = await Promise.all(games.map(g => getPlayerProps(g.id)));
  const merged = new Map<string, PlayerProp>();
  for (const m of maps) { for (const [k, v] of m) merged.set(k, v); }
  setCached(ck, merged, CACHE_PROPS);
  return merged;
}

// ── Batch season averages (GOAT tier) ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getBatchSeasonAverages(playerIds: number[], season: number): Promise<Map<number, Record<string, any>>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = new Map<number, Record<string, any>>();
  if (playerIds.length === 0) return result;

  const CHUNK = 25;
  const chunks: number[][] = [];
  for (let i = 0; i < playerIds.length; i += CHUNK) chunks.push(playerIds.slice(i, i + CHUNK));

  const responses = await Promise.all(
    chunks.map(chunk => {
      const sp = new URLSearchParams();
      sp.append('season', String(season));
      sp.append('season_type', 'regular');
      sp.append('type', 'base');
      for (const id of chunk) sp.append('player_ids[]', String(id));
      return axios.get(`${BDL_BASE}/season_averages/general?${sp.toString()}`, {
        headers: { Authorization: BDL_KEY },
        timeout: 15000,
      }).then(r => r.data).catch(err => {
        console.warn('[savg] batch chunk failed:', (err as Error).message);
        return { data: [] };
      });
    }),
  );

  for (const resp of responses) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = resp?.data ?? [];
    for (const row of rows) {
      const pid = row.player_id ?? row.player?.id;
      const stats = row.stats ?? row;
      if (pid) result.set(pid, { ...stats, games_played: stats.games_played ?? row.games_played });
    }
  }
  return result;
}

// ── Stat context (research) ──────────────────────────────────────────────────

export async function fetchStatContext(playerName: string, propType: string): Promise<StatContext | null> {
  try {
    const player = await findPlayer(playerName);
    if (!player) return null;

    // Only fetch recent games (last ~4 weeks) — enough for L5/L10 calc.
    // BDL ignores direction=desc and returns oldest first, so start_date
    // ensures we get recent games within per_page limit.
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);

    // Fetch season avg, game logs, AND today's real prop lines in parallel
    const [avgData, logsData, allProps] = await Promise.all([
      bdlGet('/season_averages', { player_id: player.id, season: BDL_SEASON }).catch(() => ({ data: [] })),
      bdlGet('/stats', {
        'player_ids[]': player.id,
        'seasons[]': BDL_SEASON,
        per_page: 25,
        start_date: fourWeeksAgo,
      }),
      getAllTodaysProps().catch(() => new Map<string, PlayerProp>()),
    ]);

    const rawLogs: Array<Record<string, unknown>> = logsData?.data ?? [];
    // Sort by date DESCENDING (newest first) — BDL's sort param is unreliable.
    rawLogs.sort((a, b) => {
      const da = (a['game'] as Record<string, string>)?.date || '';
      const db = (b['game'] as Record<string, string>)?.date || '';
      return db.localeCompare(da);
    });
    const playedLogs = rawLogs.filter(g => parseMins(g['min'] as string | number) >= 10);
    // Use dedicated season averages if available; otherwise estimate from recent logs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let avgRow: Record<string, any> | undefined = avgData?.data?.[0];
    if (!avgRow && playedLogs.length >= 3) {
      const n = playedLogs.length;
      const avg = (key: string) => playedLogs.reduce((s: number, g) => s + (Number(g[key]) || 0), 0) / n;
      avgRow = { pts: avg('pts'), reb: avg('reb'), ast: avg('ast'), games_played: n };
    }
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

    const values = playedLogs
      .slice(0, 10)
      .map(g =>
        propType === 'combined'
          ? (Number(g['pts']) || 0) + (Number(g['reb']) || 0) + (Number(g['ast']) || 0)
          : Number(g[statKey!]) || 0
      );

    if (values.length < 3) return null;

    // Look up real sportsbook prop line; fall back to season avg
    const internalStat = statKey ?? (propType === 'combined' ? 'pra' : null);
    const propKey = internalStat ? `${player.id}:${internalStat}` : null;
    const realProp = propKey ? (allProps.get(propKey) ?? null) : null;
    const propLine = realProp ? realProp.line_value : Math.round(seasonAvg * 10) / 10;

    const recentAvg5  = values.slice(0, 5).reduce((a, b) => a + b, 0) / Math.min(5, values.length);
    const recentAvg10 = values.reduce((a, b) => a + b, 0) / values.length;

    return {
      propLine,
      recentAvg5:  Math.round(recentAvg5  * 10) / 10,
      recentAvg10: Math.round(recentAvg10 * 10) / 10,
      stdDev:      Math.round(calcStdDev(values) * 10) / 10,
      overHitRate: Math.round((values.filter(v => v > propLine).length / values.length) * 100) / 100,
      streak:      calcStreak(values, propLine),
      recentGames: values,
      gamesPlayed: Number(avgRow.games_played) || values.length,
      lineSource:  realProp ? realProp.vendor : 'season_avg',
      overOdds:    realProp?.over_odds ?? null,
      underOdds:   realProp?.under_odds ?? null,
    };
  } catch (err) {
    console.error('[research] fetchStatContext error:', (err as Error).message);
    return null;
  }
}

// ── Sentiment ─────────────────────────────────────────────────────────────────

export interface SocialMention {
  content:   string;
  source:    'reddit' | 'espn';
  url:       string;
  timestamp: Date;
  score?:    number;
}

export interface SentimentScore {
  overall_score:   number;
  volume:          number;
  keywords:        string[];
  bullish_signals: number;
  bearish_signals: number;
}

const BULLISH = ['hot','fire','beast','dominant','mvp','unstoppable','lock','elite','bucket',
  'clutch','healthy','motivated','rolling','streak','strong','consistent','efficient',
  'explosion','dropped','killing'];
const BEARISH  = ['injury','injured','hurt','questionable','doubtful','out','miss','slumping',
  'cold','struggling','bench','rest','limited','suspension','inconsistent','slow',
  'tired','dnp','trade','frustration'];

export async function scrapePlayerMentions(playerName: string): Promise<SocialMention[]> {
  const [reddit, espn] = await Promise.allSettled([
    (async (): Promise<SocialMention[]> => {
      const q = encodeURIComponent(`${playerName} NBA`);
      const res = await axios.get(
        `https://www.reddit.com/search.json?q=${q}&sort=new&limit=25&t=week`,
        { headers: { 'User-Agent': 'NBA-Research-Bot/1.0' }, timeout: 8000 }
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((res.data?.data?.children ?? []) as any[])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((p: any) => {
          const sub: string = (p.data?.subreddit || '').toLowerCase();
          return sub.includes('nba') || sub.includes('basketball');
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((p: any): SocialMention => ({
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
      const articles: any[] = res.data?.articles ?? [];
      const parts = playerName.toLowerCase().split(' ');
      return articles
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((a: any) => {
          const text = `${a.headline} ${a.description || ''}`.toLowerCase();
          return parts.every(p => text.includes(p));
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((a: any): SocialMention => ({
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

export function analyzeSentiment(mentions: SocialMention[]): SentimentScore {
  if (!mentions.length) {
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
  const keywords = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w]) => w);
  return {
    overall_score:   total > 0 ? Math.max(-1, Math.min(1, (bull - bear) / total)) : 0,
    volume:          mentions.length,
    keywords,
    bullish_signals: Math.round(bull),
    bearish_signals: Math.round(bear),
  };
}

// ── Research report generation ────────────────────────────────────────────────

export interface ResearchReport {
  playerName:      string;
  propType:        string;
  prediction:      'over' | 'under' | 'neutral';
  confidence:      number;
  reasoning:       string;
  keyFactors:      string[];
  sentimentWeight: string;
  statWeight:      string;
  generatedAt:     Date;
  expiresAt:       Date;
  simulated:       boolean;
}

// 15-min in-memory cache (valid within a warm serverless instance)
interface CacheEntry { report: ResearchReport; expiresAt: number; }
const reportCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000;

function cacheKey(name: string, prop: string) { return `${name.toLowerCase()}:${prop}`; }

export function getCachedReport(name: string, prop: string): ResearchReport | null {
  const entry = reportCache.get(cacheKey(name, prop));
  return entry && entry.expiresAt > Date.now() ? entry.report : null;
}

function setCachedReport(name: string, prop: string, report: ResearchReport) {
  reportCache.set(cacheKey(name, prop), { report, expiresAt: Date.now() + CACHE_TTL_MS });
}

// Formatting helpers
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
  if (!s) return 'No active streak';
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
      const s = sentiment?.overall_score ?? 0;
      if (Math.abs(s) > 0.15) { prediction = s > 0 ? 'over' : 'under'; confidence = 0.50 + Math.abs(s) * 0.15; }
    }
    if (ctx.stdDev > 7) confidence = Math.max(0.45, confidence - 0.08);
  } else {
    const s = sentiment?.overall_score ?? 0;
    if (Math.abs(s) > 0.15) { prediction = s > 0 ? 'over' : 'under'; confidence = 0.50 + Math.abs(s) * 0.2; }
  }
  const now = new Date();
  return {
    playerName, propType, prediction, confidence,
    reasoning: ctx
      ? `Simulated: L5 avg ${r1(ctx.recentAvg5)} vs ${ctx.lineSource && ctx.lineSource !== 'season_avg' ? ctx.lineSource + ' line' : 'line'} ${r1(ctx.propLine)} (${sign(ctx.recentAvg5 - ctx.propLine)}), hit rate ${Math.round(ctx.overHitRate * 100)}% over last 10.`
      : `Simulated: insufficient data for ${playerName} ${propType}.`,
    keyFactors: ctx ? [
      `L5 avg: ${r1(ctx.recentAvg5)} vs ${ctx.lineSource && ctx.lineSource !== 'season_avg' ? ctx.lineSource + ' line' : 'line'} ${r1(ctx.propLine)} (${sign(ctx.recentAvg5 - ctx.propLine)})`,
      `Over hit rate L10: ${Math.round(ctx.overHitRate * 100)}%`,
      `Consistency: ${consistencyLabel(ctx.stdDev)} (σ=${r1(ctx.stdDev)})`,
      streakLabel(ctx.streak),
    ] : [],
    sentimentWeight: 'Low (10%)', statWeight: 'Primary (90%)',
    generatedAt: now,
    expiresAt:   new Date(now.getTime() + 24 * 60 * 60 * 1000),
    simulated: true,
  };
}

// Claude API call disabled during development to avoid API costs.
// To re-enable for production:
//   1. Set ENABLE_CLAUDE_RESEARCH=true in Vercel env vars
//   2. Ensure ANTHROPIC_API_KEY is set
//   3. Redeploy
// Uses Haiku 4.5 (~5x cheaper than Sonnet) + prompt caching for 90% input discount.
// Estimated cost: ~$5/month at 50 reports/day.
async function callClaude(prompt: string): Promise<string | null> {
  if (process.env.ENABLE_CLAUDE_RESEARCH !== 'true' || !ANTHROPIC_KEY) return null;
  try {
    const res = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: [{ type: 'text', text: 'You are an expert NBA prop betting analyst focused on finding edges. Respond ONLY with valid JSON.', cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        timeout: 15000,
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

function buildPrompt(
  playerName: string, propType: string,
  mentions: SocialMention[], sentiment: SentimentScore | null, ctx: StatContext | null
): string {
  if (!ctx || ctx.gamesPlayed < 3) {
    const st = sentiment ? `Score: ${(sentiment.overall_score * 100).toFixed(0)}% | Volume: ${sentiment.volume}` : 'No sentiment data';
    return `You are an expert NBA prop analyst.\nPlayer: ${playerName} | Prop: ${propType}\nInsufficient recent game data. Social sentiment: ${st}\nRespond ONLY with valid JSON:\n{"prediction":"neutral","confidence":40,"reasoning":"Insufficient data.","key_factors":["No recent game data"],"sentiment_weight":"N/A","stat_weight":"N/A"}`;
  }
  const d5 = r1(ctx.recentAvg5 - ctx.propLine);
  const d10 = r1(ctx.recentAvg10 - ctx.propLine);
  const games = ctx.recentGames.slice(0, 10).map(v => {
    const d = v - ctx.propLine;
    return `${v}${Math.abs(d) < 0.5 ? '=' : d > 0 ? '↑' : '↓'}`;
  }).join(', ');
  const st = sentiment
    ? `Score: ${(sentiment.overall_score * 100).toFixed(0)}% | Volume: ${sentiment.volume} | Keywords: ${sentiment.keywords.join(', ')}`
    : 'No sentiment data';
  const top = mentions.slice(0, 5).map(m => `- ${m.content} (${m.source})`).join('\n');
  const lineLabel = ctx.lineSource && ctx.lineSource !== 'season_avg'
    ? `${r1(ctx.propLine)} (${ctx.lineSource})`
    : `${r1(ctx.propLine)} (est. from season avg)`;
  const oddsStr = ctx.overOdds != null && ctx.underOdds != null
    ? ` | Over ${ctx.overOdds > 0 ? '+' : ''}${ctx.overOdds} / Under ${ctx.underOdds > 0 ? '+' : ''}${ctx.underOdds}`
    : '';
  return `You are an expert NBA prop betting analyst focused on finding edges.\nPlayer: ${playerName} | Prop: ${propType} | Line: ${lineLabel}${oddsStr}\nLast 10 games: ${games}\nHit rate L10: ${Math.round(ctx.overHitRate * 100)}% | L5 avg: ${r1(ctx.recentAvg5)} (${sign(d5)}) | L10 avg: ${r1(ctx.recentAvg10)} (${sign(d10)})\nStd dev: ${r1(ctx.stdDev)} (${consistencyLabel(ctx.stdDev)}) | Streak: ${streakLabel(ctx.streak)}\nSentiment: ${st}\n${top}\nRespond ONLY with valid JSON:\n{"prediction":"over"|"under"|"neutral","confidence":0-100,"reasoning":"<2-3 sentences>","key_factors":["..."],"sentiment_weight":"<e.g. Low (10%)>","stat_weight":"<e.g. Primary (90%)>"}`;
}

// ── NBA headshots ─────────────────────────────────────────────────────────────

const NBA_CDN_BASE = 'https://cdn.nba.com/headshots/nba/latest/260x190';
export const buildNbaPhotoUrl = (personId: number): string => `${NBA_CDN_BASE}/${personId}.png`;

const NBA_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.nba.com/',
  'Origin': 'https://www.nba.com',
  'x-nba-stats-origin': 'stats',
  'x-nba-stats-token': 'true',
};

const NBA_LIST_TTL = 24 * 60 * 60 * 1000;
let _nbaListCache: { data: Array<{ id: number; name: string }>; ts: number } | null = null;
let _nbaListFetch: Promise<Array<{ id: number; name: string }>> | null = null;

function getNbaPlayerList(): Promise<Array<{ id: number; name: string }>> {
  const now = Date.now();
  if (_nbaListCache && now - _nbaListCache.ts < NBA_LIST_TTL) return Promise.resolve(_nbaListCache.data);
  if (!_nbaListFetch) {
    _nbaListFetch = axios
      .get('https://stats.nba.com/stats/commonallplayers?LeagueID=00&Season=2024-25&IsOnlyCurrentSeason=0', {
        headers: NBA_HEADERS,
        timeout: 3000,
      })
      .then(resp => {
        const hdrs: string[] = resp.data.resultSets[0].headers;
        const rows: unknown[][] = resp.data.resultSets[0].rowSet;
        const idIdx   = hdrs.indexOf('PERSON_ID');
        const nameIdx = hdrs.indexOf('DISPLAY_FIRST_LAST');
        const data = rows.map(r => ({ id: r[idIdx] as number, name: (r[nameIdx] as string).toLowerCase() }));
        _nbaListCache = { ts: Date.now(), data };
        _nbaListFetch = null;
        return data;
      })
      .catch(err => {
        _nbaListFetch = null;
        throw err;
      });
  }
  return _nbaListFetch;
}

export async function findNbaPersonId(playerName: string): Promise<number | null> {
  const list = await getNbaPlayerList();
  const needle   = playerName.toLowerCase();
  const lastName = needle.split(' ').pop() ?? needle;
  return (
    list.find(p => p.name === needle)?.id ??
    list.find(p => p.name.endsWith(` ${lastName}`))?.id ??
    null
  );
}

// ── Research report generation ────────────────────────────────────────────────

export async function generateReport(
  playerName: string, propType: string,
  mentions: SocialMention[], sentiment: SentimentScore | null, ctx: StatContext | null
): Promise<ResearchReport> {
  const cached = getCachedReport(playerName, propType);
  if (cached) return cached;

  const text = await callClaude(buildPrompt(playerName, propType, mentions, sentiment, ctx));
  let report: ResearchReport;
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
