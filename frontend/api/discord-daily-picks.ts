/**
 * POST /api/discord-daily-picks
 *
 * Generates daily picks using live edge data and posts a Discord-ready
 * text message via webhook. Uses the play_score / play_tier system and
 * the formatDailyPicksForDiscord() formatter.
 *
 * Does NOT modify edge scoring, confidence, or formatter logic.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BDL_SEASON } from './_lib.js';
import { computeEdgeFeed, type EdgeEntry, type StatKey } from './edge.js';
import {
  formatDailyPicksForDiscord,
  selectTopPicks,
  type EdgeLike,
} from './_lib/discord-picks.js';

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// ── edge → EdgeLike adapter ─────────────────────────────────────────────────

function toEdgeLike(entry: EdgeEntry, stat: StatKey): EdgeLike {
  const flags: string[] = [];
  if (entry.games_played < 5) flags.push('small_sample');
  if (entry.streak_warning) flags.push('streak_warning');
  if (entry.days_since_last_game > 5) flags.push('stale_data');

  return {
    player_name:     entry.player_name,
    stat:            stat === 'pra' ? 'PRA' : 'Points',
    delta:           entry.delta,
    direction:       entry.direction,
    confidence:      entry.confidence,
    confidence_tier: entry.confidence_tier,
    edge_score:      entry.edge_score,
    edge_tier:       entry.edge_tier,
    play_score:      entry.play_score,
    play_tier:       entry.play_tier,
    flags:           flags.length > 0 ? flags : undefined,
  };
}

// ── daily picks generator ────────────────────────────────────────────────────

export async function generateDailyPicksMessage(
  stat: StatKey = 'pts',
  minMinutes = 20,
  season: number = BDL_SEASON,
): Promise<{ message: string; aTier: number; bTier: number; totalProcessed: number }> {
  console.log(`[daily-picks] generation started — stat=${stat} season=${season} min=${minMinutes}`);

  const entries = await computeEdgeFeed(stat, minMinutes, season);
  console.log(`[daily-picks] entries from edge: ${entries.length}`);

  const edgeLikes: EdgeLike[] = entries.map(e => toEdgeLike(e, stat));
  const { aTier, bTier } = selectTopPicks(edgeLikes);

  console.log(`[daily-picks] A-tier: ${aTier.length} | B-tier: ${bTier.length}`);

  const message = formatDailyPicksForDiscord(edgeLikes);

  const isEmpty = aTier.length === 0 && bTier.length === 0;
  if (isEmpty) {
    console.log('[daily-picks] no qualifying plays today');
  }

  return {
    message,
    aTier: aTier.length,
    bTier: bTier.length,
    totalProcessed: entries.length,
  };
}

// ── handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!WEBHOOK_URL) return res.status(400).json({ error: 'DISCORD_WEBHOOK_URL not configured' });

  const stat       = (req.query.stat as StatKey) || 'pts';
  const season     = parseInt(req.query.season as string) || BDL_SEASON;
  const minMinutes = parseFloat(req.query.min_minutes as string) || 20;
  const dryRun     = req.query.dry_run === '1' || req.query.dry_run === 'true';

  try {
    const result = await generateDailyPicksMessage(stat, minMinutes, season);

    if (dryRun) {
      return res.json({
        ok: true,
        dry_run: true,
        ...result,
      });
    }

    // Post to Discord as a plain text message (not embed)
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'long', month: 'short', day: 'numeric',
      timeZone: 'America/New_York',
    });
    const header = `📅 **Daily Picks — ${dateStr}** (${stat.toUpperCase()})\n\n`;

    const webhookRes = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: header + result.message }),
    });

    if (!webhookRes.ok) {
      const text = await webhookRes.text().catch(() => '');
      throw new Error(`Discord webhook ${webhookRes.status}: ${text.slice(0, 200)}`);
    }

    console.log(`[daily-picks] posted to Discord — A:${result.aTier} B:${result.bTier}`);

    return res.json({
      ok: true,
      posted: true,
      ...result,
    });
  } catch (err) {
    console.error('[daily-picks] error:', (err as Error).message);
    return res.status(500).json({
      error: 'Failed to generate daily picks',
      detail: (err as Error).message,
    });
  }
}
