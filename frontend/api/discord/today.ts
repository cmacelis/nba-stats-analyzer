/**
 * POST /api/discord/today?stat=pts|pra&season=2025&min_minutes=20&top_n=5
 *
 * Posts "Today's Top N Edges" to the Discord webhook channel.
 * Designed to be called once daily via a cron or manually.
 *
 * Required env vars:
 *   DISCORD_WEBHOOK_URL  — already scoped to the target channel when created
 *
 * Optional env vars:
 *   SITE_URL             — for deep-link generation (auto-detected from VERCEL_URL)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, BDL_SEASON } from '../_lib.js';
import { computeEdgeFeed, StatKey } from '../edge.js';

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const SITE_URL    = process.env.SITE_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function edgeFeedUrl(stat: StatKey, season: number, minMinutes: number): string {
  if (!SITE_URL) return '';
  const p = new URLSearchParams({ stat, s: String(season), min_minutes: String(minMinutes) });
  return `${SITE_URL}/edge?${p.toString()}`;
}

function trackUrl(playerId: number, stat: StatKey, season: number, minMinutes: number, dir: 'over' | 'under'): string {
  if (!SITE_URL) return '';
  const p = new URLSearchParams({
    stat, s: String(season), min_minutes: String(minMinutes),
    track_player_id: String(playerId), track_stat: stat, track_direction: dir,
  });
  return `${SITE_URL}/edge?${p.toString()}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!WEBHOOK_URL) return res.status(400).json({ error: 'DISCORD_WEBHOOK_URL not configured' });

  const stat       = ((req.query.stat as string) || 'pts') as StatKey;
  const season     = parseInt(req.query.season     as string) || BDL_SEASON;
  const minMinutes = parseFloat(req.query.min_minutes as string) || 20;
  const topN       = parseInt(req.query.top_n      as string) || 5;

  try {
    const entries = await computeEdgeFeed(stat, minMinutes, season);
    const top     = entries.slice(0, topN);
    const label   = stat === 'pra' ? 'PRA' : 'PTS';
    const now     = new Date();
    const dateStr = `${WEEKDAYS[now.getUTCDay()]}, ${now.toUTCString().slice(5, 16)}`;
    const feedUrl = edgeFeedUrl(stat, season, minMinutes);

    const playerFields = top.map((e, i) => {
      const isOver = e.delta >= 0;
      const sign   = isOver ? '+' : '';
      const emoji  = isOver ? '🔥' : '🧊';
      const dir    = (isOver ? 'over' : 'under') as 'over' | 'under';
      const tUrl   = trackUrl(e.player_id, stat, season, minMinutes, dir);
      const trackLink = tUrl ? ` · [Track ➕](${tUrl})` : '';
      return {
        name:   `${emoji} #${i + 1}  ${e.player_name} (${e.team_abbrev})`,
        value:  `Season **${e.season_avg.toFixed(1)}** · L5 **${e.recent_avg.toFixed(1)}** · Δ **${sign}${e.delta.toFixed(1)}**${trackLink}`,
        inline: false,
      };
    });

    const embed = {
      title:       `📊 Today's Top ${top.length} ${label} Edges`,
      color:       0x6366f1, // indigo
      description: `Season avg vs last 5 games — ${dateStr}`,
      fields: [
        ...playerFields,
        ...(feedUrl ? [{ name: '\u200b', value: `[🔗 View full Edge Feed](${feedUrl})`, inline: false }] : []),
      ],
      footer:    { text: `NBA Edge Detector · min ${minMinutes} min/game · via BallDontLie` },
      timestamp: now.toISOString(),
    };

    const webhookRes = await fetch(WEBHOOK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ embeds: [embed] }),
    });

    if (!webhookRes.ok) {
      const text = await webhookRes.text().catch(() => '');
      throw new Error(`Discord webhook ${webhookRes.status}: ${text.slice(0, 200)}`);
    }

    return res.json({ ok: true, posted: top.length, stat, season });
  } catch (err) {
    console.error('[discord/today] error:', (err as Error).message);
    return res.status(500).json({ error: 'Failed to post today digest', detail: (err as Error).message });
  }
}
