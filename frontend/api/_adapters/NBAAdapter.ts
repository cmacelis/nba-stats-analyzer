/**
 * NBAAdapter — Phase 0.5
 *
 * Thin wrapper around the existing _lib.ts helpers and edge-feed function.
 * All methods delegate to the same data sources / API clients already in
 * production; no new logic, no behavior change, no new env vars.
 *
 * Phase 1 will replace internals with richer NBA-specific data pipelines.
 */

import type {
  ILeagueAdapter,
  PlayerSearchResult,
  Game,
  EdgeEntry,
  StatContext,
  CompareResult,
  StatKey,
} from '../../src/adapters/types.js';

import {
  searchPlayers,
  fetchStatContext,
  findNbaPersonId,
  buildNbaPhotoUrl,
  bdlGet,
} from '../_lib.js';

import { computeEdgeFeed } from '../edge.js';

export class NBAAdapter implements ILeagueAdapter {
  // ─── playerSearch ──────────────────────────────────────────────────────────

  async playerSearch(query: string, _limit = 10): Promise<PlayerSearchResult[]> {
    const result = await searchPlayers(query);
    const players = (result.data ?? []) as Array<{
      id: number;
      first_name: string;
      last_name: string;
      position?: string;
      team?: { full_name: string; abbreviation: string };
    }>;

    // Best-effort photo enrichment — identical to _handlers/players.ts
    return Promise.all(
      players.map(async (p) => {
        const fullName = `${p.first_name} ${p.last_name}`;
        const personId = await findNbaPersonId(fullName).catch(() => null);
        return {
          ...p,
          photo_url: personId ? buildNbaPhotoUrl(personId) : null,
        };
      }),
    );
  }

  // ─── games ─────────────────────────────────────────────────────────────────

  async games(): Promise<Game[]> {
    const today = new Date();
    const dates = Array.from({ length: 3 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0];
    });

    const responses = await Promise.all(
      dates.map((date) =>
        bdlGet('/games', { dates: [date], per_page: 100 }).catch(() => ({ data: { data: [] } })),
      ),
    );

    const allGames = responses.flatMap((r) => (r.data?.data ?? []) as Game[]);
    return allGames.filter((g) => g.status !== 'Final');
  }

  // ─── playerStats ───────────────────────────────────────────────────────────

  async playerStats(playerName: string, propType: StatKey): Promise<StatContext> {
    return fetchStatContext(playerName, propType) as Promise<StatContext>;
  }

  // ─── compare ───────────────────────────────────────────────────────────────

  async compare(id1: number, id2: number, season: number): Promise<CompareResult> {
    const [r1, r2] = await Promise.all([
      bdlGet('/season_averages', { season, player_ids: [id1] }),
      bdlGet('/season_averages', { season, player_ids: [id2] }),
    ]);

    let player1 = r1.data?.data?.[0] ?? null;
    let player2 = r2.data?.data?.[0] ?? null;
    let effectiveSeason = season;

    // Fallback to previous season if either player has no data — mirrors
    // the behaviour in _handlers/compare.ts to keep results consistent.
    if (!player1 || !player2) {
      const prev = season - 1;
      const [f1, f2] = await Promise.all([
        bdlGet('/season_averages', { season: prev, player_ids: [id1] }),
        bdlGet('/season_averages', { season: prev, player_ids: [id2] }),
      ]);
      player1 = f1.data?.data?.[0] ?? null;
      player2 = f2.data?.data?.[0] ?? null;
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
