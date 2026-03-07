/**
 * POST /api/alerts/run?stat=pts|pra&direction=over|under|both&min_minutes=20&min_delta=2.0&top_n=10&season=2025&league=nba|wnba
 *
 * Runs the edge feed, finds players above/below the delta threshold, deduplicates
 * via KV cooldown, and posts Discord embeds for newly-triggered edges.
 *
 * Required env vars:
 *   DISCORD_WEBHOOK_URL     — Discord webhook URL (Server Settings → Integrations → Webhooks)
 *
 * Optional env vars:
 *   DISCORD_WEBHOOK_WNBA_URL — Separate webhook for WNBA alerts (falls back to DISCORD_WEBHOOK_URL with [WNBA] tag)
 *   ALERT_MIN_DELTA_PTS     — minimum |L5-vs-season| delta for PTS alerts (default: 2.0)
 *   ALERT_MIN_DELTA_PRA     — minimum |L5-vs-season| delta for PRA alerts (default: 3.5)
 *   ALERT_COOLDOWN_MINUTES  — cooldown per player+stat+direction before re-alerting (default: 180)
 *   SITE_URL                — base URL for embed links; auto-detected from VERCEL_URL if absent
 *
 * direction param:
 *   over  => delta >= +min_delta   (L5 trending above season avg — bet the over)
 *   under => delta <= -min_delta   (L5 trending below season avg — bet the under)
 *   both  => |delta| >= min_delta  (default — catches both signals)
 *
 * league param:
 *   nba   => NBA edges and alerts (default)
 *   wnba  => WNBA edges and alerts
 *
 * Cooldown storage:
 *   Uses Vercel KV (same KV_REST_API_URL / KV_REST_API_TOKEN as picks).
 *   Redis key: {league}:alert:cd:{stat}:{direction}:{player_id}  TTL = ALERT_COOLDOWN_MINUTES * 60
 *   If KV is not configured, cooldown is skipped (every run sends all matching alerts).
 *
 * Scheduling (recommended):
 *   Trigger via external scheduler or Vercel Cron (POST only — not GET).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, BDL_SEASON } from '../_lib.js';
import { AdapterFactory } from '../_adapters/AdapterFactory.js';
import { EdgeEntry, StatKey } from '../edge.js';

// ── types ──────────────────────────────────────────────────────────────────────

type Direction = 'over' | 'under' | 'both';

// ── config ─────────────────────────────────────────────────────────────────────

const WEBHOOK_URL        = process.env.DISCORD_WEBHOOK_URL;
const WEBHOOK_WNBA_URL   = process.env.DISCORD_WEBHOOK_WNBA_URL;
const KV_URL             = process.env.KV_REST_API_URL;
const KV_TOKEN           = process.env.KV_REST_API_TOKEN;
const KV_OK              = !!(KV_URL && KV_TOKEN);

const MIN_DELTA_PTS = parseFloat(process.env.ALERT_MIN_DELTA_PTS  || '2.0');
const MIN_DELTA_PRA = parseFloat(process.env.ALERT_MIN_DELTA_PRA  || '3.5');
const COOLDOWN_SECS = parseInt(process.env.ALERT_COOLDOWN_MINUTES || '180') * 60;

// VERCEL_URL is injected automatically by Vercel (no protocol prefix)
const SITE_URL = process.env.SITE_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

// ── KV cooldown helpers ────────────────────────────────────────────────────────

const cdKey = (league: string, stat: string, direction: Direction, playerId: number) =>
  `${league}:alert:cd:${stat}:${direction}:${playerId}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function kvCmd(...args: unknown[]): Promise<any> {
  const res = await fetch(KV_URL!, {
    method:  'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`KV ${args[0]} failed: ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

/** Returns true if a cooldown key exists (player was already alerted recently). */
async function onCooldown(league: string, stat: string, direction: Direction, playerId: number): Promise<boolean> {
  if (!KV_OK) return false;
  const val = await kvCmd('GET', cdKey(league, stat, direction, playerId));
  return val !== null;
}

/** Sets the cooldown key with TTL. Called after a successful Discord post. */
async function markAlerted(league: string, stat: string, direction: Direction, playerId: number): Promise<void> {
  if (!KV_OK) return;
  await kvCmd('SET', cdKey(league, stat, direction, playerId), '1', 'EX', COOLDOWN_SECS);
}

// ── candidate filtering ────────────────────────────────────────────────────────

function matchesDirection(entry: EdgeEntry, direction: Direction, minDelta: number): boolean {
  if (direction === 'over')  return entry.delta >= minDelta;
  if (direction === 'under') return entry.delta <= -minDelta;
  return Math.abs(entry.delta) >= minDelta; // both
}

// ── Discord helpers ────────────────────────────────────────────────────────────

function buildEdgeFeedUrl(league: string, stat: StatKey, season: number, minMinutes: number): string {
  if (!SITE_URL) return '';
  const p = new URLSearchParams({ 
    stat, 
    s: String(season), 
    min_minutes: String(minMinutes),
    league
  });
  return `${SITE_URL}/edge?${p.toString()}`;
}

function buildTrackPickUrl(league: string, entry: EdgeEntry, stat: StatKey, season: number, minMinutes: number): string {
  if (!SITE_URL) return '';
  const dir = entry.delta >= 0 ? 'over' : 'under';
  const p = new URLSearchParams({
    stat,
    s:               String(season),
    min_minutes:     String(minMinutes),
    track_player_id: String(entry.player_id),
    track_stat:      stat,
    track_direction: dir,
  });
  return `${SITE_URL}/edge?${p.toString()}`;
}

function buildEmbed(entry: EdgeEntry, stat: StatKey, direction: Direction, minMinutes: number, season: number, league: string, leagueTag: string): object {
  const label    = stat === 'pra' ? 'PRA' : 'PTS';
  const isOver   = entry.delta >= 0;
  const sign     = isOver ? '+' : '';
  const emoji    = isOver ? '🔥' : '🧊';
  const edgeType = isOver ? 'Over Edge' : 'Under Edge';
  const color    = isOver ? 0x22c55e : 0x3b82f6; // green : blue
  const feedUrl  = buildEdgeFeedUrl(league, stat, season, minMinutes);
  const pickUrl  = buildTrackPickUrl(league, entry, stat, season, minMinutes);

  const linkParts = [
    feedUrl && `[🔗 Open Edge Feed](${feedUrl})`,
    pickUrl && `[➕ Track this pick](${pickUrl})`,
  ].filter(Boolean);

  return {
    title:       `${leagueTag}${emoji} ${entry.player_name} (${entry.team_abbrev}) — ${label} ${edgeType}`,
    color,
    ...(feedUrl && { url: feedUrl }),
    description: `**${sign}${entry.delta.toFixed(1)}** vs season average (L5 trending ${isOver ? 'hot' : 'cold'})`,
    fields: [
      { name: 'Season Avg',  value: entry.season_avg.toFixed(1),          inline: true  },
      { name: 'L5 Avg',      value: entry.recent_avg.toFixed(1),          inline: true  },
      { name: 'Δ',           value: `${sign}${entry.delta.toFixed(1)}`,   inline: true  },
      { name: 'Direction',   value: isOver ? 'Over ↑' : 'Under ↓',       inline: true  },
      { name: 'Games',       value: String(entry.games_played),           inline: true  },
      { name: 'Min Filter',  value: `≥${minMinutes} min/game`,            inline: true  },
      { name: 'L5 Scores',   value: entry.last5.join(' · '),              inline: false },
      ...(linkParts.length ? [{ name: '\u200b', value: linkParts.join('  ·  '), inline: false }] : []),
    ],
    footer: { text: `NBA Edge Detector · ${new Date().toUTCString()}` },
  };
}

async function postToDiscord(webhookUrl: string, embeds: object[]): Promise<void> {
  const res = await fetch(webhookUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ embeds }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Discord webhook ${res.status}: ${text.slice(0, 200)}`);
  }
}

// ── handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const league = (req.query.league as string) || 'nba';
  
  // Determine which webhook to use
  let webhookUrl = WEBHOOK_URL;
  let leagueTag = '';
  
  if (league === 'wnba') {
    if (WEBHOOK_WNBA_URL) {
      webhookUrl = WEBHOOK_WNBA_URL;
    } else if (WEBHOOK_URL) {
      leagueTag = '[WNBA] ';
      webhookUrl = WEBHOOK_URL;
    }
  }
  
  if (!webhookUrl) {
    return res.status(400).json({ error: `DISCORD_WEBHOOK_URL not configured for league ${league}` });
  }

  const stat        = ((req.query.stat      as string) || 'pts') as StatKey;
  const rawDir      = (req.query.direction  as string) || 'both';
  const direction   = (['over', 'under', 'both'].includes(rawDir) ? rawDir : 'both') as Direction;
  const minMinutes  = parseFloat(req.query.min_minutes as string) || 20;
  const minDelta    = parseFloat(req.query.min_delta   as string)
    || (stat === 'pra' ? MIN_DELTA_PRA : MIN_DELTA_PTS);
  const topN        = parseInt(req.query.top_n  as string) || 10;
  const season      = parseInt(req.query.season as string) || BDL_SEASON;

  try {
    const entries = await AdapterFactory.get(league).edgeFeed({ 
      stat, 
      minMinutes, 
      season 
    });

    // Filter by direction + threshold, cap at top_n (sort by |delta| desc already done)
    const candidates = entries
      .filter(e => matchesDirection(e, direction, minDelta))
      .slice(0, topN);

    // Separate into send vs skip based on cooldown
    const toSend:  EdgeEntry[] = [];
    const skipped: string[]    = [];

    for (const entry of candidates) {
      if (await onCooldown(league, stat, direction, entry.player_id)) {
        skipped.push(entry.player_name);
      } else {
        toSend.push(entry);
      }
    }

    // Build embeds and post to Discord (max 10 per message)
    if (toSend.length > 0) {
      const embeds = toSend.map(e => buildEmbed(e, stat, direction, minMinutes, season, league, leagueTag));
      for (let i = 0; i < embeds.length; i += 10) {
        await postToDiscord(webhookUrl, embeds.slice(i, i + 10));
      }
    }

    // Mark as alerted only after successful Discord post
    await Promise.all(toSend.map(e => markAlerted(league, stat, direction, e.player_id).catch(() => null)));

    return res.json({
      ok:               true,
      sent:             toSend.map(e => ({ name: e.player_name, delta: e.delta })),
      skipped,
      total_candidates: candidates.length,
      stat,
      direction,
      min_delta:        minDelta,
      season,
      kv_configured:    KV_OK,
    });
  } catch (err) {
    console.error('[alerts] error:', (err as Error).message);
    return res.status(500).json({ error: 'Alert run failed', detail: (err as Error).message });
  }
}
