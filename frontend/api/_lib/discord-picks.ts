/**
 * Discord-ready Daily Picks formatter.
 *
 * Additive layer — consumes edge API output, does NOT modify edge scoring,
 * confidence logic, or existing endpoint contracts.
 */

// ── types ────────────────────────────────────────────────────────────────────

export interface EdgeLike {
  player_name?: string;
  stat?: string;
  delta?: number;
  direction?: 'over' | 'under';
  confidence?: number;
  confidence_tier?: string;
  edge_score?: number;
  edge_tier?: string;
  play_score?: number;
  play_tier?: string;
  flags?: string[];
}

interface RankedPicks {
  aTier: EdgeLike[];
  bTier: EdgeLike[];
}

// ── ranking ──────────────────────────────────────────────────────────────────

/**
 * Sort entries by play_score desc, then confidence desc.
 * Entries missing play_score or player_name are dropped.
 */
export function rankByPlayScore(entries: EdgeLike[]): EdgeLike[] {
  return entries
    .filter(e => e.player_name && typeof e.play_score === 'number')
    .sort((a, b) => {
      const scoreDiff = (b.play_score ?? 0) - (a.play_score ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (b.confidence ?? 0) - (a.confidence ?? 0);
    });
}

// ── tier selection ───────────────────────────────────────────────────────────

/**
 * Return top A-tier plays (max 3) and optional B-tier plays (max 3).
 */
export function selectTopPicks(entries: EdgeLike[], maxPerTier = 3): RankedPicks {
  const ranked = rankByPlayScore(entries);
  return {
    aTier: ranked.filter(e => e.play_tier === 'A').slice(0, maxPerTier),
    bTier: ranked.filter(e => e.play_tier === 'B').slice(0, maxPerTier),
  };
}

// ── single entry formatter ───────────────────────────────────────────────────

function formatEntry(e: EdgeLike, index: number): string {
  const name = e.player_name ?? 'Unknown';
  const dir = (e.direction ?? 'over').toUpperCase();
  const stat = (e.stat ?? 'Points').charAt(0).toUpperCase() + (e.stat ?? 'Points').slice(1);
  const ps = e.play_score ?? '—';
  const et = capitalise(e.edge_tier ?? 'unknown');
  const ct = capitalise(e.confidence_tier ?? 'unknown');

  let line = `${index}. **${name}** — ${dir} ${stat}\n`;
  line += `   Play Score: ${ps} | Edge: ${et} | Confidence: ${ct}`;

  if (e.flags && e.flags.length > 0) {
    line += `\n   ⚠️ Flags: ${e.flags.join(', ')}`;
  }

  return line;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── main formatter ───────────────────────────────────────────────────────────

/**
 * Produce a Discord-safe daily picks string from edge results.
 * Returns empty string if no qualifying plays exist.
 */
export function formatDailyPicksForDiscord(entries: EdgeLike[]): string {
  const { aTier, bTier } = selectTopPicks(entries);

  if (aTier.length === 0 && bTier.length === 0) {
    return '📭 No qualifying plays today.';
  }

  const sections: string[] = [];

  if (aTier.length > 0) {
    const header = aTier.length === 1 ? '🔥 A-TIER PLAY' : '🔥 A-TIER PLAYS';
    const body = aTier.map((e, i) => formatEntry(e, i + 1)).join('\n');
    sections.push(`${header}\n${body}`);
  }

  if (bTier.length > 0) {
    const header = '📋 B-TIER (BACKUP)';
    const body = bTier.map((e, i) => formatEntry(e, i + 1)).join('\n');
    sections.push(`${header}\n${body}`);
  }

  return sections.join('\n\n');
}
