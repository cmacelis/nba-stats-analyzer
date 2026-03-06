/**
 * NBAAdapter — Sprint A
 *
 * Thin wrapper around the existing _lib.ts helpers and edge-feed function.
 * All methods replicate the exact logic already in production handlers;
 * no new APIs, no new env vars, no behavior change.
 *
 * Phase 1 will swap internals for richer NBA-specific pipelines.
 */

import type {
  ILeagueAdapter,
  PlayerSearchResponse,
  Game,
  EdgeEntry,
  StatContext,
  CompareResult,
  StatKey,
} from '../../frontend/src/adapters/types.js';

import {
  searchPlayers,
  fetchStatContext,
  findNbaPersonId,
  buildNbaPhotoUrl,
  bdlGet,
  BdlPlayer,
} from '../_lib.js';

import { computeEdgeFeed } from '../edge.js';

export class NBAAdapter implements ILeagueAdapter {
  // ─── playerSearch ──────────────────────────────────────────────────────────
  // Mirrors _handlers/players.ts exactly:
  //   searchPlayers() → BDL envelope → enrich data[] with photo_url → { ...result, data: enriched }

  async playerSearch(_query: string): Promise<PlayerSearchResponse> {
    const result = await searchPlayers(_query, 'nba');
    const enriched = await Promise.all(
      result.data.map(async (p: BdlPlayer) => {
        const fullName = `${p.first_name} ${p.last_name}`;
        const personId = await findNbaPersonId(fullName).catch(() => null);
        return { ...p, photo_url: personId != null ? buildNbaPhotoUrl(personId) : null };
      }),
    );
    return { ...result, data: enriched };
  }

  // ─── games ─────────────────────────────────────────────────────────────────
  // Mirrors _handlers/games.ts exactly:
  //   single BDL call with start_date/end_date range, per_page:25, filter non-Final

  async games(): Promise<Game[]> {
    const today = new Date();
    const end = new Date(today);
    end.setDate(today.getDate() + 3);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const data = await bdlGet('/games', {
      start_date: fmt(today),
      end_date:   fmt(end),
      per_page:   25,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data?.data ?? []).filter((g: any) => g.status !== 'Final') as Game[];
  }

  // ─── playerStats ───────────────────────────────────────────────────────────

  async playerStats(playerName: string, propType: StatKey): Promise<StatContext> {
    return fetchStatContext(playerName, propType) as Promise<StatContext>;
  }

  // ─── compare ───────────────────────────────────────────────────────────────
  // Mirrors _handlers/compare.ts: fetch both seasons, fall back to prev season
  // if either player has no data, to keep results consistent.

  async compare(id1: number, id2: number, season: number): Promise<CompareResult> {
    const [r1, r2] = await Promise.all([
      bdlGet('/season_averages', { season, player_id: id1 }),
      bdlGet('/season_averages', { season, player_id: id2 }),
    ]);

    let player1 = r1.data?.[0] ?? null;
    let player2 = r2.data?.[0] ?? null;
    let effectiveSeason = season;

    if (!player1 || !player2) {
      const prev = season - 1;
      const [f1, f2] = await Promise.all([
        bdlGet('/season_averages', { season: prev, player_id: id1 }),
        bdlGet('/season_averages', { season: prev, player_id: id2 }),
      ]);
      player1 = f1.data?.[0] ?? null;
      player2 = f2.data?.[0] ?? null;
      effectiveSeason = prev;
    }

    return { player1, player2, head_to_head: [], effectiveSeason };
  }

  // ─── photo ─────────────────────────────────────────────────────────────────

  async photo(playerName: string): Promise<string | null> {
    const personId = await findNbaPersonId(playerName).catch(() => null);
    return personId ? buildNbaPhotoUrl(personId) : null;
  }

  // ─── edgeFeed ──────────────────────────────────────────────────────────────

  async edgeFeed(options: {
    stat: StatKey;
    minMinutes: number;
    season: number;
  }): Promise<EdgeEntry[]> {
    return computeEdgeFeed(
      options.stat,
      options.minMinutes,
      options.season,
    ) as Promise<EdgeEntry[]>;
  }
}
