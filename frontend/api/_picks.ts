/**
 * _picks.ts — shared pick types and KV helpers.
 * Imported by picks handler, picks-settle handler, and discord-results handler.
 */

// ── types ─────────────────────────────────────────────────────────────────────

export interface Pick {
  id:               string;
  created_at:       string;
  type:             'signal' | 'bet';
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
  actual?:              number | null;
  result?:              'W' | 'L' | 'P' | null;
  settled_at?:          string | null;
  settled_game_date?:   string | null;
}

// ── KV helpers ────────────────────────────────────────────────────────────────

export const KV_URL   = process.env.KV_REST_API_URL;
export const KV_TOKEN = process.env.KV_REST_API_TOKEN;
export const PICKS_KEY = 'nba:picks';
export const KV_OK     = !!(KV_URL && KV_TOKEN);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function kvCmd(...args: unknown[]): Promise<any> {
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

export async function storePick(pick: Pick): Promise<void> {
  const score = new Date(pick.created_at).getTime();
  await kvCmd('ZADD', PICKS_KEY, score, JSON.stringify(pick));
  const cutoff90 = Date.now() - 90 * 24 * 60 * 60 * 1000;
  await kvCmd('ZREMRANGEBYSCORE', PICKS_KEY, '-inf', cutoff90).catch(() => null);
}

export async function listPicks(since: number): Promise<Pick[]> {
  const raw = await kvCmd('ZRANGEBYSCORE', PICKS_KEY, since, '+inf') as string[];
  if (!Array.isArray(raw)) return [];
  return raw
    .map(r => { try { return JSON.parse(r) as Pick; } catch { return null; } })
    .filter(Boolean)
    .reverse() as Pick[];
}

export async function updatePick(pick: Pick): Promise<void> {
  const score = new Date(pick.created_at).getTime();
  const raw = await kvCmd('ZRANGEBYSCORE', PICKS_KEY, score, score) as string[];
  if (Array.isArray(raw)) {
    const old = raw.find(r => {
      try { return (JSON.parse(r) as Pick).id === pick.id; } catch { return false; }
    });
    if (old) await kvCmd('ZREM', PICKS_KEY, old);
  }
  await kvCmd('ZADD', PICKS_KEY, score, JSON.stringify(pick));
}
