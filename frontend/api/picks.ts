/**
 * /api/picks — cross-device pick tracking backed by Vercel KV (Redis).
 *
 * Setup (one-time, ~30 seconds):
 *   vercel kv create nba-picks
 *   vercel env pull          # injects KV_REST_API_URL + KV_REST_API_TOKEN locally
 *
 * Without those env vars the endpoint degrades gracefully:
 *   POST → { ok: false, configured: false }
 *   GET  → { data: [], configured: false }
 *
 * Storage: Redis sorted-set key "nba:picks", score = Unix timestamp (ms).
 * Each member is a JSON-encoded Pick object. TTL: 90 days (auto-pruned on write).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';

// ── types ─────────────────────────────────────────────────────────────────────

export interface Pick {
  id:               string;
  created_at:       string;
  type:             'signal' | 'bet'; // 'bet' when line is provided, else 'signal'
  player_id:        number;
  player_name:      string;
  team:             string;
  stat:             'pts' | 'reb' | 'ast' | 'pra';
  season_used:      number;
  season_avg:       number;
  l5_avg:           number;
  delta:            number;
  min_minutes:      number;
  direction:        'over' | 'under';
  confidence_tier:  'high' | 'medium' | 'low';
  line?:            number;
  notes?:           string;
}

// ── KV helpers (raw REST — no extra bundling issues) ──────────────────────────

const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const PICKS_KEY = 'nba:picks';
const KV_OK     = !!(KV_URL && KV_TOKEN);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function kvCmd(...args: unknown[]): Promise<any> {
  const res = await fetch(KV_URL!, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`KV ${args[0]} failed: ${res.status}`);
  const json = await res.json() as { result: unknown };
  return json.result;
}

async function storePick(pick: Pick): Promise<void> {
  const score = new Date(pick.created_at).getTime();
  await kvCmd('ZADD', PICKS_KEY, score, JSON.stringify(pick));
  // Prune entries older than 90 days on every write (keep store lean)
  const cutoff90 = Date.now() - 90 * 24 * 60 * 60 * 1000;
  await kvCmd('ZREMRANGEBYSCORE', PICKS_KEY, '-inf', cutoff90).catch(() => null);
}

async function listPicks(since: number): Promise<Pick[]> {
  // ZRANGEBYSCORE returns members between [since, +inf] sorted ascending
  const raw = await kvCmd('ZRANGEBYSCORE', PICKS_KEY, since, '+inf') as string[];
  if (!Array.isArray(raw)) return [];
  return raw
    .map(r => { try { return JSON.parse(r) as Pick; } catch { return null; } })
    .filter(Boolean)
    .reverse() as Pick[]; // newest first
}

// ── handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  // ── POST /api/picks ─────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    if (!KV_OK) return res.json({ ok: false, configured: false });

    const body = req.body as Partial<Pick>;
    const required: (keyof Pick)[] = [
      'player_id', 'player_name', 'team', 'stat',
      'season_used', 'season_avg', 'l5_avg', 'delta',
      'min_minutes', 'direction', 'confidence_tier',
    ];
    for (const field of required) {
      if (body[field] === undefined || body[field] === null) {
        return res.status(400).json({ error: `Missing field: ${field}` });
      }
    }
    const valid_stats = ['pts', 'reb', 'ast', 'pra'];
    const valid_dirs  = ['over', 'under'];
    const valid_tiers = ['high', 'medium', 'low'];
    if (!valid_stats.includes(body.stat!))             return res.status(400).json({ error: 'Invalid stat' });
    if (!valid_dirs.includes(body.direction!))         return res.status(400).json({ error: 'Invalid direction' });
    if (!valid_tiers.includes(body.confidence_tier!))  return res.status(400).json({ error: 'Invalid confidence_tier' });

    const hasLine = body.line != null && !isNaN(Number(body.line));
    const pick: Pick = {
      id:              crypto.randomUUID(),
      created_at:      new Date().toISOString(),
      type:            hasLine ? 'bet' : 'signal',
      player_id:       Number(body.player_id),
      player_name:     String(body.player_name),
      team:            String(body.team),
      stat:            body.stat!,
      season_used:     Number(body.season_used),
      season_avg:      Number(body.season_avg),
      l5_avg:          Number(body.l5_avg),
      delta:           Number(body.delta),
      min_minutes:     Number(body.min_minutes),
      direction:       body.direction!,
      confidence_tier: body.confidence_tier!,
      ...(hasLine     && { line:  Number(body.line)  }),
      ...(body.notes  && { notes: String(body.notes).slice(0, 280) }),
    };

    try {
      await storePick(pick);
      return res.status(201).json({ ok: true, pick });
    } catch (err) {
      console.error('[picks] store error:', (err as Error).message);
      return res.status(500).json({ error: 'Failed to save pick' });
    }
  }

  // ── GET /api/picks?range=7d|30d ─────────────────────────────────────────────
  if (req.method === 'GET') {
    if (!KV_OK) return res.json({ data: [], configured: false });

    const range = req.query.range as string || '30d';
    const days  = range === '7d' ? 7 : 30;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    try {
      const picks = await listPicks(since);
      return res.json({ data: picks, configured: true, range });
    } catch (err) {
      console.error('[picks] list error:', (err as Error).message);
      return res.status(500).json({ error: 'Failed to fetch picks' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
