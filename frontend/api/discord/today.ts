/**
 * POST /api/discord/today?season=2025&min_minutes=20&top_n=5
 *
 * Posts "Today's Top 5 Edges" for BOTH PTS and PRA as two embeds in one message.
 * Pass stat=pts or stat=pra to limit to a single stat.
 * Designed to be called once daily via a cron or manually.
 *
 * Required env vars:
 *   DISCORD_WEBHOOK_URL  — already scoped to the VIP alerts channel
 *
 * Optional env vars:
 *   SITE_URL             — for deep-link generation (auto-detected from VERCEL_URL)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, BDL_SEASON } from '../_lib.js';
import { computeEdgeFeed, EdgeEntry, StatKey } from '../edge.js';

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const SITE_URL    = process.env.SITE_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// PTS = blue, PRA = violet — distinct but both feel premium
const STAT_COLOR: Record<StatKey, number> = {
  pts: 0x3b82f6,
  pra: 0x8b5cf6,
};

function buildEdgeFeedUrl(stat: StatKey, season: number, minMinutes: number): string {
  if (!SITE_URL) return '';
  const p = new URLSearchParams({ stat, s: String(season), min_minutes: String(minMinutes) });
  return `${SITE_URL}/edge?${p.toString()}`;
}

function buildTrackUrl(playerId: number, stat: StatKey, season: number, minMinutes: number, dir: 'over' | 'under'): string {
  if (!SITE_URL) return '';
  const p = new URLSearchParams({
    stat, s: String(season), min_minutes: String(minMinutes),
    track_player_id: String(playerId), track_stat: stat, track_direction: dir,
  });
  return `${SITE_URL}/edge?${p.toString()}`;
}

function buildStatEmbed(
  stat:       StatKey,
  entries:    EdgeEntry[],
  topN:       number,
  season:     number,
  minMinutes: number,
  dateStr:    string,
): object {
  const top   = entries.slice(0, topN);
  const label = stat === 'pra' ? 'PRA (Pts+Reb+Ast)' : 'PTS (Points)';

  const playerFields = top.map((e, i) => {
    const isOver    = e.delta >= 0;
    const sign      = isOver ? '+' : '';
    const emoji     = isOver ? '🔥' : '🧊';
    const dir       = (isOver ? 'over' : 'under') as 'over' | 'under';
    const tUrl      = buildTrackUrl(e.player_id, stat, season, minMinutes, dir);
    const trackLink = tUrl ? ` · [Track ➕](${tUrl})` : '';
    return {
      name:   `${emoji} #${i + 1}  ${e.player_name} (${e.team_abbrev})`,
      value:  `Season **${e.season_avg.toFixed(1)}** · L5 **${e.recent_avg.toFixed(1)}** · Δ **${sign}${e.delta.toFixed(1)}**${trackLink}`,
      inline: false,
    };
  });

  const feedUrl = buildEdgeFeedUrl(stat, season, minMinutes);

  return {
    title:       `📊 Today's Top ${top.length} ${label} Edges`,
    color:       STAT_COLOR[stat],
    description: dateStr,
    fields: [
      ...playerFields,
      ...(feedUrl ? [{ name: '\u200b', value: `[🔗 Full Edge Feed](${feedUrl})`, inline: false }] : []),
    ],
    footer:    { text: `NBA Edge Detector · min ${minMinutes} min/game · via BallDontLie` },
    timestamp: new Date().toISOString(),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!WEBHOOK_URL) return res.status(400).json({ error: 'DISCORD_WEBHOOK_URL not configured' });

  const rawStat    = req.query.stat as string | undefined;
  const season     = parseInt(req.query.season      as string) || BDL_SEASON;
  const minMinutes = parseFloat(req.query.min_minutes as string) || 20;
  const topN       = parseInt(req.query.top_n       as string) || 5;

  // Default: both PTS + PRA. Pass ?stat=pts or ?stat=pra to limit.
  const stats: StatKey[] = (rawStat === 'pts' || rawStat === 'pra') ? [rawStat] : ['pts', 'pra'];

  const now     = new Date();
  const dateStr = `${WEEKDAYS[now.getUTCDay()]}, ${now.toUTCString().slice(5, 16)}`;

  try {
    // Fetch all stats in parallel
    const results = await Promise.all(
      stats.map(s => computeEdgeFeed(s, minMinutes, season))
    );

    const embeds = stats.map((s, i) =>
      buildStatEmbed(s, results[i], topN, season, minMinutes, dateStr)
    );

    const webhookRes = await fetch(WEBHOOK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ embeds }),
    });

    if (!webhookRes.ok) {
      const text = await webhookRes.text().catch(() => '');
      throw new Error(`Discord webhook ${webhookRes.status}: ${text.slice(0, 200)}`);
    }

    const posted = Object.fromEntries(
      stats.map((s, i) => [s, Math.min(results[i].length, topN)])
    );
    return res.json({ ok: true, posted, season });
  } catch (err) {
    console.error('[discord/today] error:', (err as Error).message);
    return res.status(500).json({ error: 'Failed to post today digest', detail: (err as Error).message });
  }
}
