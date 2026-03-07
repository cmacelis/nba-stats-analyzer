/**
 * POST /api/alerts/run-enhanced?stat=pts|pra&direction=over|under|both&min_minutes=20&min_delta=2.0&top_n=10&season=2025&league=nba|wnba&check_user_rules=true
 *
 * Extended alerts/run that also checks personalized user rules (Phase 5).
 * Stores matching alerts in Firestore for the Discord bot to send as DMs.
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

const MIN_DELTA_PTS = parseFloat(process.env.ALERT_MIN_DELTA_PTS  || '2.0');
const MIN_DELTA_PRA = parseFloat(process.env.ALERT_MIN_DELTA_PRA  || '3.5');
const COOLDOWN_SECS = parseInt(process.env.ALERT_COOLDOWN_MINUTES || '180') * 60;

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

async function onCooldown(league: string, stat: string, direction: Direction, playerId: number): Promise<boolean> {
  if (!KV_OK) return false;
  const val = await kvCmd('GET', cdKey(league, stat, direction, playerId));
  return val !== null;
}

async function markAlerted(league: string, stat: string, direction: Direction, playerId: number): Promise<void> {
  if (!KV_OK) return;
  await kvCmd('SET', cdKey(league, stat, direction, playerId), '1', 'EX', COOLDOWN_SECS);
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

  try {
    // Use AdapterFactory for league support (matches run.ts pattern)
    const entries = await AdapterFactory.get(league).edgeFeed({ stat, minMinutes, season });

    const candidates = entries
      .filter(e => matchesDirection(e, direction, minDelta))
      .slice(0, topN);

    const toSend:  EdgeEntry[] = [];
    const skipped: string[]    = [];

    for (const entry of candidates) {
      if (await onCooldown(league, stat, direction, entry.player_id)) {
        skipped.push(entry.player_name);
      } else {
        toSend.push(entry);
      }
    }

    // Check personalized user rules
    let userRuleMatches: RuleMatch[] = [];
    if (checkUserRules) {
      try {
        userRuleMatches = await checkRulesAgainstEdges(entries, league as 'nba' | 'wnba', stat as 'pts' | 'pra', minMinutes);

        // Store personalized alerts for Discord bot DMs
        for (const match of userRuleMatches) {
          try {
            await storePendingAlert(match.rule, match.entry, stat as 'pts' | 'pra');
            await updateRuleLastTriggered(match.rule.id);
          } catch (error) {
            console.error(`[Personal Alert] Failed for user ${match.rule.userId}:`, error);
          }
        }
      } catch (error) {
        console.error('[Personal Rules] Error checking user rules:', error);
        // Continue with channel alerts even if personal rules fail
      }
    }

    // Post channel alerts to Discord
    if (toSend.length > 0) {
      const embeds = toSend.map(e => buildEmbed(e, stat, direction, minMinutes, season, league, leagueTag));
      for (let i = 0; i < embeds.length; i += 10) {
        await postToDiscord(webhookUrl, embeds.slice(i, i + 10));
      }
    }

    await Promise.all(toSend.map(e => markAlerted(league, stat, direction, e.player_id).catch(() => null)));

    return res.json({
      ok:               true,
      sent:             toSend.map(e => ({ name: e.player_name, delta: e.delta })),
      skipped,
      total_candidates: candidates.length,
      user_rule_matches: userRuleMatches.map(m => ({
        userId: m.rule.userId, playerName: m.entry.player_name,
        delta: m.entry.delta, ruleId: m.rule.id,
      })),
      stat, direction, min_delta: minDelta, season, league,
      kv_configured:      KV_OK,
      user_rules_checked: checkUserRules,
    });
  } catch (err) {
    console.error('[alerts/run-enhanced] error:', (err as Error).message);
    return res.status(500).json({ error: 'Alert run failed', detail: (err as Error).message });
  }
}
