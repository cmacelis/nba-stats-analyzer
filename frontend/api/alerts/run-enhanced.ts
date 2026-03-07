/**
 * POST /api/alerts/run-enhanced
 *
 * Extended alerts/run that also checks personalized user rules (Phase 5).
 * Stores matching alerts in Firestore for the Discord bot to send as DMs.
 *
 * Phase 6: skip-reason accounting, dedup, per-user rate limiting.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, BDL_SEASON } from '../_lib.js';
import { AdapterFactory } from '../_adapters/AdapterFactory.js';
import { EdgeEntry, StatKey } from '../edge.js';
import { checkRulesAgainstEdges, updateRuleLastTriggered, RuleMatch } from './rules/_checkRules.js';
import { storePendingAlert } from './rules/_pendingAlerts.js';

type Direction = 'over' | 'under' | 'both';

// ── config ─────────────────────────────────────────────────────────────────────

const WEBHOOK_URL        = process.env.DISCORD_WEBHOOK_URL;
const WEBHOOK_WNBA_URL   = process.env.DISCORD_WEBHOOK_WNBA_URL;
const KV_URL             = process.env.KV_REST_API_URL;
const KV_TOKEN           = process.env.KV_REST_API_TOKEN;
const KV_OK              = !!(KV_URL && KV_TOKEN);

const MIN_DELTA_PTS   = parseFloat(process.env.ALERT_MIN_DELTA_PTS  || '2.0');
const MIN_DELTA_PRA   = parseFloat(process.env.ALERT_MIN_DELTA_PRA  || '3.5');
const COOLDOWN_SECS   = parseInt(process.env.ALERT_COOLDOWN_MINUTES || '180') * 60;
const USER_RATE_LIMIT = parseInt(process.env.ALERT_USER_RATE_LIMIT  || '10'); // per hour
const RATE_LIMIT_TTL  = 3600; // 1 hour window

const SITE_URL = process.env.SITE_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

// ── KV helpers ───────────────────────────────────────────────────────────────

const cdKey = (league: string, stat: string, direction: Direction, playerId: number) =>
  `${league}:alert:cd:${stat}:${direction}:${playerId}`;

const dedupKey = (userId: string, ruleId: string, playerId: number) =>
  `pending:dedup:${userId}:${ruleId}:${playerId}`;

const rateKey = (userId: string) =>
  `user:rate:${userId}`;

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

async function onCooldown(league: string, stat: string, direction: Direction, playerId: number): Promise<boolean> {
  if (!KV_OK) return false;
  const val = await kvCmd('GET', cdKey(league, stat, direction, playerId));
  return val !== null;
}

async function markAlerted(league: string, stat: string, direction: Direction, playerId: number): Promise<void> {
  if (!KV_OK) return;
  await kvCmd('SET', cdKey(league, stat, direction, playerId), '1', 'EX', COOLDOWN_SECS);
}

async function isDuplicate(userId: string, ruleId: string, playerId: number): Promise<boolean> {
  if (!KV_OK) return false;
  const val = await kvCmd('GET', dedupKey(userId, ruleId, playerId));
  return val !== null;
}

async function markDedup(userId: string, ruleId: string, playerId: number): Promise<void> {
  if (!KV_OK) return;
  await kvCmd('SET', dedupKey(userId, ruleId, playerId), '1', 'EX', COOLDOWN_SECS);
}

/** Returns true if user is over the hourly rate limit. Also increments the counter. */
async function isRateLimited(userId: string): Promise<boolean> {
  if (!KV_OK) return false;
  const key = rateKey(userId);
  const count = await kvCmd('INCR', key);
  if (count === 1) {
    // First alert this window — set TTL
    await kvCmd('EXPIRE', key, RATE_LIMIT_TTL);
  }
  return count > USER_RATE_LIMIT;
}

// ── candidate filtering ────────────────────────────────────────────────────────

function matchesDirection(entry: EdgeEntry, direction: Direction, minDelta: number): boolean {
  if (direction === 'over')  return entry.delta >= minDelta;
  if (direction === 'under') return entry.delta <= -minDelta;
  return Math.abs(entry.delta) >= minDelta;
}

// ── Discord helpers ────────────────────────────────────────────────────────────

function buildEdgeFeedUrl(league: string, stat: StatKey, season: number, minMinutes: number): string {
  if (!SITE_URL) return '';
  const p = new URLSearchParams({ stat, s: String(season), min_minutes: String(minMinutes), league });
  return `${SITE_URL}/edge?${p.toString()}`;
}

function buildTrackPickUrl(league: string, entry: EdgeEntry, stat: StatKey, season: number, minMinutes: number): string {
  if (!SITE_URL) return '';
  const dir = entry.delta >= 0 ? 'over' : 'under';
  const p = new URLSearchParams({
    stat, s: String(season), min_minutes: String(minMinutes),
    track_player_id: String(entry.player_id), track_stat: stat, track_direction: dir,
  });
  return `${SITE_URL}/edge?${p.toString()}`;
}

function buildEmbed(entry: EdgeEntry, stat: StatKey, direction: Direction, minMinutes: number, season: number, league: string, leagueTag: string): object {
  const label    = stat === 'pra' ? 'PRA' : 'PTS';
  const isOver   = entry.delta >= 0;
  const sign     = isOver ? '+' : '';
  const emoji    = isOver ? '\u{1F525}' : '\u{1F9CA}';
  const edgeType = isOver ? 'Over Edge' : 'Under Edge';
  const color    = isOver ? 0x22c55e : 0x3b82f6;
  const feedUrl  = buildEdgeFeedUrl(league, stat, season, minMinutes);
  const pickUrl  = buildTrackPickUrl(league, entry, stat, season, minMinutes);

  const linkParts = [
    feedUrl && `[\u{1F517} Open Edge Feed](${feedUrl})`,
    pickUrl && `[\u2795 Track this pick](${pickUrl})`,
  ].filter(Boolean);

  return {
    title:       `${leagueTag}${emoji} ${entry.player_name} (${entry.team_abbrev}) \u2014 ${label} ${edgeType}`,
    color,
    ...(feedUrl && { url: feedUrl }),
    description: `**${sign}${entry.delta.toFixed(1)}** vs season average (L5 trending ${isOver ? 'hot' : 'cold'})`,
    fields: [
      { name: 'Season Avg',  value: entry.season_avg.toFixed(1),        inline: true  },
      { name: 'L5 Avg',      value: entry.recent_avg.toFixed(1),        inline: true  },
      { name: '\u0394',      value: `${sign}${entry.delta.toFixed(1)}`, inline: true  },
      { name: 'Direction',   value: isOver ? 'Over \u2191' : 'Under \u2193', inline: true },
      { name: 'Games',       value: String(entry.games_played),         inline: true  },
      { name: 'Min Filter',  value: `\u2265${minMinutes} min/game`,     inline: true  },
      { name: 'L5 Scores',   value: entry.last5.join(' \u00B7 '),       inline: false },
      ...(linkParts.length ? [{ name: '\u200b', value: linkParts.join('  \u00B7  '), inline: false }] : []),
    ],
    footer: { text: `${league.toUpperCase()} Edge Detector \u00B7 ${new Date().toUTCString()}` },
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

// ── param helpers ─────────────────────────────────────────────────────────────

/** Read a param from query then body, supporting both snake_case and camelCase. */
function param(req: VercelRequest, snake: string, camel: string): string | undefined {
  const q = req.query[snake] ?? req.query[camel];
  const b = req.body?.[snake] ?? req.body?.[camel];
  const v = b ?? q;  // body wins over query
  return v !== undefined && v !== null ? String(v) : undefined;
}

/** Parse a numeric param; returns undefined only when nothing was provided. */
function numParam(req: VercelRequest, snake: string, camel: string): number | undefined {
  const raw = param(req, snake, camel);
  if (raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isNaN(n) ? undefined : n;
}

// ── skip reason type ─────────────────────────────────────────────────────────

type SkipReason = 'cooldown' | 'dedup' | 'rate_limit';
interface DebugEntry { userId: string; ruleId: string; playerId: number; playerName: string; reason: SkipReason; key?: string }

// ── handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const league = param(req, 'league', 'league') ?? 'nba';

  // Determine webhook
  let webhookUrl = WEBHOOK_URL;
  let leagueTag = '';
  if (league === 'wnba') {
    if (WEBHOOK_WNBA_URL) { webhookUrl = WEBHOOK_WNBA_URL; }
    else if (WEBHOOK_URL) { leagueTag = '[WNBA] '; }
  }
  if (!webhookUrl) {
    return res.status(400).json({ error: `DISCORD_WEBHOOK_URL not configured for league ${league}` });
  }

  const stat        = (param(req, 'stat', 'stat') ?? 'pts') as StatKey;
  const rawDir      = param(req, 'direction', 'direction') ?? 'both';
  const direction   = (['over', 'under', 'both'].includes(rawDir) ? rawDir : 'both') as Direction;
  const minMinutes  = numParam(req, 'min_minutes', 'minMinutes') ?? 20;
  const minDelta    = numParam(req, 'min_delta', 'minDelta') ?? (stat === 'pra' ? MIN_DELTA_PRA : MIN_DELTA_PTS);
  const topN        = numParam(req, 'top_n', 'topN') ?? 10;
  const season      = numParam(req, 'season', 'season') ?? BDL_SEASON;
  const crRaw       = param(req, 'check_user_rules', 'checkUserRules');
  const checkUserRules = crRaw !== 'false';
  const debug       = param(req, 'debug', 'debug') === '1';

  try {
    // Use AdapterFactory for league support (matches run.ts pattern)
    const entries = await AdapterFactory.get(league).edgeFeed({ stat, minMinutes, season });

    const candidates = entries
      .filter(e => matchesDirection(e, direction, minDelta))
      .slice(0, topN);

    // ── Channel alerts: cooldown check ──────────────────────────────────────

    const toSend:  EdgeEntry[] = [];
    const skipped: string[]    = [];
    let skippedCooldown = 0;

    for (const entry of candidates) {
      if (await onCooldown(league, stat, direction, entry.player_id)) {
        skipped.push(entry.player_name);
        skippedCooldown++;
      } else {
        toSend.push(entry);
      }
    }

    // ── Personal user rules: dedup + rate limit ─────────────────────────────

    let rulesChecked    = 0;
    let matchesFound    = 0;
    let createdPending  = 0;
    let skippedDedup    = 0;
    let skippedRateLimit = 0;
    const debugReasons: DebugEntry[] = [];
    const triggeredRuleIds = new Set<string>();

    if (checkUserRules) {
      try {
        const allMatches = await checkRulesAgainstEdges(entries, league as 'nba' | 'wnba', stat as 'pts' | 'pra', minMinutes);
        rulesChecked = allMatches.length > 0 ? allMatches.length : 0; // total match attempts
        matchesFound = allMatches.length;

        // Track per-user rate limit state within this run
        const userLimitHit = new Set<string>();

        for (const match of allMatches) {
          const { rule, entry } = match;
          const playerId = entry.player_id;

          // 1) Rate limit check (per user, per hour)
          if (userLimitHit.has(rule.userId)) {
            skippedRateLimit++;
            if (debug) debugReasons.push({ userId: rule.userId, ruleId: rule.id, playerId, playerName: entry.player_name, reason: 'rate_limit', key: rateKey(rule.userId) });
            continue;
          }
          const limited = await isRateLimited(rule.userId);
          if (limited) {
            userLimitHit.add(rule.userId);
            skippedRateLimit++;
            if (debug) debugReasons.push({ userId: rule.userId, ruleId: rule.id, playerId, playerName: entry.player_name, reason: 'rate_limit', key: rateKey(rule.userId) });
            continue;
          }

          // 2) Dedup check (same user+rule+player combo)
          const dup = await isDuplicate(rule.userId, rule.id, playerId);
          if (dup) {
            skippedDedup++;
            if (debug) debugReasons.push({ userId: rule.userId, ruleId: rule.id, playerId, playerName: entry.player_name, reason: 'dedup', key: dedupKey(rule.userId, rule.id, playerId) });
            continue;
          }

          // 3) Create pending alert
          try {
            await storePendingAlert(rule, entry, stat as 'pts' | 'pra');
            await markDedup(rule.userId, rule.id, playerId);
            createdPending++;
            triggeredRuleIds.add(rule.id);
          } catch (error) {
            console.error(`[Personal Alert] Failed for user ${rule.userId}:`, error);
          }
        }

        // Update lastTriggered only for rules that actually created pending alerts
        for (const ruleId of triggeredRuleIds) {
          await updateRuleLastTriggered(ruleId).catch(() => {});
        }

      } catch (error) {
        console.error('[Personal Rules] Error checking user rules:', error);
      }
    }

    // ── Post channel alerts to Discord ──────────────────────────────────────

    if (toSend.length > 0) {
      const embeds = toSend.map(e => buildEmbed(e, stat, direction, minMinutes, season, league, leagueTag));
      for (let i = 0; i < embeds.length; i += 10) {
        await postToDiscord(webhookUrl, embeds.slice(i, i + 10));
      }
    }

    await Promise.all(toSend.map(e => markAlerted(league, stat, direction, e.player_id).catch(() => null)));

    // ── Response ────────────────────────────────────────────────────────────

    return res.json({
      ok:               true,
      // Legacy fields (backward compatible)
      sent:             toSend.map(e => ({ name: e.player_name, delta: e.delta })),
      skipped,
      total_candidates: candidates.length,
      // Phase 6: skip-reason counters
      skipped_cooldown:   skippedCooldown,
      skipped_dedup:      skippedDedup,
      skipped_rate_limit: skippedRateLimit,
      rules_checked:      rulesChecked,
      matches_found:      matchesFound,
      created_pending:    createdPending,
      pending_written:    createdPending,
      // Config echo
      stat, direction, min_delta: minDelta, season, league,
      kv_configured:      KV_OK,
      user_rules_checked: checkUserRules,
      user_rate_limit:    USER_RATE_LIMIT,
      // Debug details (only when debug=1)
      ...(debug && debugReasons.length > 0 && { debug_reasons: debugReasons }),
    });
  } catch (err) {
    console.error('[alerts/run-enhanced] error:', (err as Error).message);
    return res.status(500).json({ error: 'Alert run failed', detail: (err as Error).message });
  }
}
