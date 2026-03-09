/**
 * picks/[[...path]].ts — optional catch-all for /api/picks and /api/picks/settle.
 * Consolidates two serverless functions into one.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib.js';
import { picksSettleHandler } from '../_handlers/picks-settle.js';
import { type Pick, KV_OK, storePick, listPicks } from '../_picks.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  const pathname = new URL(req.url!, `https://${req.headers.host}`).pathname;

  // ── POST /api/picks/settle ──────────────────────────────────────────────
  if (pathname.endsWith('/picks/settle')) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    return picksSettleHandler(req, res);
  }

  // ── POST /api/picks ─────────────────────────────────────────────────────
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

  // ── GET /api/picks?range=7d|30d ─────────────────────────────────────────
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
