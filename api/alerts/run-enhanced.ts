/**
 * Enhanced POST /api/alerts/run with personalized rule checking.
 * 
 * Extends the original alerts/run endpoint to:
 * 1. Run existing edge detection
 * 2. Check edges against user alert rules
 * 3. Send targeted Discord messages to users whose rules match
 * 
 * Parameters same as original plus:
 * - check_user_rules: boolean (default: true) - Enable personalized rule checking
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, BDL_SEASON } from '../_lib.js';
import { computeEdgeFeed, EdgeEntry, StatKey } from '../edge.js';
import { checkRulesAgainstEdges, updateRuleLastTriggered, RuleMatch } from './rules/_checkRules.js';
import { storePendingAlert } from './rules/_pendingAlerts.js';

// ── types ──────────────────────────────────────────────────────────────────────

type Direction = 'over' | 'under' | 'both';

// ── config ─────────────────────────────────────────────────────────────────────

const WEBHOOK_URL   = process.env.DISCORD_WEBHOOK_URL;
const KV_URL        = process.env.KV_REST_API_URL;
const KV_TOKEN      = process.env.KV_REST_API_TOKEN;
const KV_OK         = !!(KV_URL && KV_TOKEN);

const MIN_DELTA_PTS = parseFloat(process.env.ALERT_MIN_DELTA_PTS  || '2.0');
const MIN_DELTA_PRA = parseFloat(process.env.ALERT_MIN_DELTA_PRA  || '3.5');
const COOLDOWN_SECS = parseInt(process.env.ALERT_COOLDOWN_MINUTES || '180') * 60;

// VERCEL_URL is injected automatically by Vercel (no protocol prefix)
const SITE_URL = process.env.SITE_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

// ── KV cooldown helpers ────────────────────────────────────────────────────────

const cdKey = (stat: string, direction: Direction, playerId: number) =>
  `nba:alert:cd:${stat}:${direction}:${playerId}`;

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
async function onCooldown(stat: string, direction: Direction, playerId: number): Promise<boolean> {
  if (!KV_OK) return false;
  const val = await kvCmd('GET', cdKey(stat, direction, playerId));
  return val !== null;
}

/** Sets the cooldown key with TTL. Called after a successful Discord post. */
async function markAlerted(stat: string, direction: Direction, playerId: number): Promise<void> {
  if (!KV_OK) return;
  await kvCmd('SET', cdKey(stat, direction, playerId), '1', 'EX', COOLDOWN_SECS);
}

// ── candidate filtering ────────────────────────────────────────────────────────

function matchesDirection(entry: EdgeEntry, direction: Direction, minDelta: number): boolean {
  if (direction === 'over')  return entry.delta >= minDelta;
  if (direction === 'under') return entry.delta <= -minDelta;
  return Math.abs(entry.delta) >= minDelta; // both
}

// ── Discord helpers ────────────────────────────────────────────────────────────

function buildEdgeFeedUrl(stat: StatKey, season: number, minMinutes: number): string {
  if (!SITE_URL) return '';
  const p = new URLSearchParams({ stat, s: String(season), min_minutes: String(minMinutes) });
  return `${SITE_URL}/edge?${p.toString()}`;
}

function buildTrackPickUrl(entry: EdgeEntry, stat: StatKey, season: number, minMinutes: number): string {
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

function buildEmbed(entry: EdgeEntry, stat: StatKey, direction: Direction, minMinutes: number, season: number): object {
  const label    = stat === 'pra' ? 'PRA' : 'PTS';
  const isOver   = entry.delta >= 0;
  const sign     = isOver ? '+' : '';
  const emoji    = isOver ? '🔥' : '🧊';
  const edgeType = isOver ? 'Over Edge' : 'Under Edge';
  const color    = isOver ? 0x22c55e : 0x3b82f6; // green : blue
  const feedUrl  = buildEdgeFeedUrl(stat, season, minMinutes);
  const pickUrl  = buildTrackPickUrl(entry, stat, season, minMinutes);

  const linkParts = [
    feedUrl && `[🔗 Open Edge Feed](${feedUrl})`,
    pickUrl && `[➕ Track this pick](${pickUrl})`,
  ].filter(Boolean);

  return {
    title:       `${emoji} ${entry.player_name} (${entry.team_abbrev}) — ${label} ${edgeType}`,
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
    footer: { text: `EdgeDetector.ai [NBA] · ${new Date().toUTCString()}` },
  };
}

async function postToDiscord(embeds: object[]): Promise<void> {
  const res = await fetch(WEBHOOK_URL!, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ embeds }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Discord webhook ${res.status}: ${text.slice(0, 200)}`);
  }
}

/**
 * Store personalized alert for Discord bot to process.
 */
async function storePersonalizedAlert(match: RuleMatch, stat: StatKey): Promise<void> {
  const { entry, rule } = match;
  
  try {
    await storePendingAlert(rule, entry, stat);
    console.log(`[Personal Alert] Stored alert for user ${rule.userId}, player ${entry.player_name}`);
  } catch (error) {
    console.error(`[Personal Alert] Failed to store alert for user ${rule.userId}:`, error);
  }
}

// ── handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  if (!WEBHOOK_URL) {
    return res.status(400).json({ error: 'DISCORD_WEBHOOK_URL not configured' });
  }

  const stat        = ((req.query.stat      as string) || 'pts') as StatKey;
  const rawDir      = (req.query.direction  as string) || 'both';
  const direction   = (['over', 'under', 'both'].includes(rawDir) ? rawDir : 'both') as Direction;
  const minMinutes  = parseFloat(req.query.min_minutes as string) || 20;
  const minDelta    = parseFloat(req.query.min_delta   as string)
    || (stat === 'pra' ? MIN_DELTA_PRA : MIN_DELTA_PTS);
  const topN        = parseInt(req.query.top_n  as string) || 10;
  const season      = parseInt(req.query.season as string) || BDL_SEASON;
  const checkUserRules = (req.query.check_user_rules as string) !== 'false';

  try {
    // Determine league from query or default to NBA
    const league = (req.query.league as 'nba' | 'wnba') || 'nba';
    
    // Compute edges (this will need to be updated to support WNBA properly)
    const entries = await computeEdgeFeed(stat, minMinutes, season);

    // Filter by direction + threshold, cap at top_n (sort by |delta| desc already done)
    const candidates = entries
      .filter(e => matchesDirection(e, direction, minDelta))
      .slice(0, topN);

    // Separate into send vs skip based on cooldown
    const toSend:  EdgeEntry[] = [];
    const skipped: string[]    = [];

    for (const entry of candidates) {
      if (await onCooldown(stat, direction, entry.player_id)) {
        skipped.push(entry.player_name);
      } else {
        toSend.push(entry);
      }
    }

    // Check user rules if enabled
    let userRuleMatches: RuleMatch[] = [];
    if (checkUserRules) {
      userRuleMatches = await checkRulesAgainstEdges(entries, league, stat, minMinutes);
      
      // Filter out edges that match user rules from toSend (Phase 5: don't post to Discord channels)
      const userMatchedPlayerIds = new Set(userRuleMatches.map(match => match.entry.player_id));
      const filteredToSend = toSend.filter(entry => !userMatchedPlayerIds.has(entry.player_id));
      
      // Update skipped list with edges removed due to user rule matches
      const removedByUserRules = toSend.filter(entry => userMatchedPlayerIds.has(entry.player_id));
      removedByUserRules.forEach(entry => {
        skipped.push(`${entry.player_name} (user rule match)`);
      });
      
      // Replace toSend with filtered list
      toSend.length = 0;
      toSend.push(...filteredToSend);
      
      // Store personalized alerts for Discord bot and update lastTriggered
      for (const match of userRuleMatches) {
        try {
          await storePersonalizedAlert(match, stat);
          await updateRuleLastTriggered(match.rule.id);
        } catch (error) {
          console.error(`[Personal Alert] Failed for user ${match.rule.userId}:`, error);
        }
      }
    }

    // Build embeds and post to Discord (max 10 per message)
    if (toSend.length > 0) {
      const embeds = toSend.map(e => buildEmbed(e, stat, direction, minMinutes, season));
      for (let i = 0; i < embeds.length; i += 10) {
        await postToDiscord(embeds.slice(i, i + 10));
      }
    }

    // Mark as alerted only after successful Discord post
    await Promise.all(toSend.map(e => markAlerted(stat, direction, e.player_id).catch(() => null)));



    return res.json({
      ok:               true,
      sent:             toSend.map(e => ({ name: e.player_name, delta: e.delta })),
      skipped,
      total_candidates: candidates.length,
      user_rule_matches: userRuleMatches.map(match => ({
        userId: match.rule.userId,
        playerName: match.entry.player_name,
        delta: match.entry.delta,
        ruleId: match.rule.id,
      })),
      stat,
      direction,
      min_delta:        minDelta,
      season,
      kv_configured:    KV_OK,
      user_rules_checked: checkUserRules,
    });
  } catch (err) {
    console.error('[alerts] error:', (err as Error).message);
    return res.status(500).json({ error: 'Alert run failed', detail: (err as Error).message });
  }
}