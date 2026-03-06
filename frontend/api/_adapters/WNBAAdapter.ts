/**
 * WNBAAdapter — Phase 1
 *
 * Minimal adapter for WNBA support.
 * Data Source Policy:
 * 1. Try BallDontLie first for WNBA if supported by the plan
 * 2. If unsupported/incomplete, fallback to ESPN WNBA schedule + player search
 * 3. Cache responses (players: 24h, games: 10–60 min)
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

import axios from 'axios';

import { computeEdgeFeed } from '../edge.js';

export class WNBAAdapter implements ILeagueAdapter {
  private readonly league = 'wnba';
  private readonly cache = new Map<string, { data: any; timestamp: number }>();

  private getCached<T>(key: string, ttlMs: number): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCached(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // ─── playerSearch ──────────────────────────────────────────────────────────
  async playerSearch(query: string): Promise<PlayerSearchResponse> {
    const cacheKey = `playerSearch:${query}`;
    const cached = this.getCached<PlayerSearchResponse>(cacheKey, 24 * 60 * 60 * 1000); // 24h
    if (cached) return cached;

    try {
      // Try BallDontLie first
      const result = await searchPlayers(query, this.league);
      const enriched = await Promise.all(
        result.data.map(async (p: BdlPlayer) => {
          const fullName = `${p.first_name} ${p.last_name}`;
          // Note: WNBA player photos may need different logic
          const personId = await findNbaPersonId(fullName).catch(() => null);
          return { ...p, photo_url: personId != null ? buildNbaPhotoUrl(personId) : null };
        }),
      );
      const response = { ...result, data: enriched };
      this.setCached(cacheKey, response);
      return response;
    } catch (error) {
      // If BDL fails, fallback to ESPN
      console.warn(`[WNBAAdapter] BDL player search failed, falling back to ESPN: ${error}`);
      return this.espnPlayerSearch(query);
    }
  }

  private async espnPlayerSearch(query: string): Promise<PlayerSearchResponse> {
    // ESPN fallback implementation
    // For now, return empty results
    return {
      data: [],
      meta: { source: 'espn_fallback', query }
    };
  }

  // ─── games ─────────────────────────────────────────────────────────────────
  async games(): Promise<Game[]> {
    const cacheKey = 'games';
    const cached = this.getCached<Game[]>(cacheKey, 10 * 60 * 1000); // 10 min
    if (cached) return cached;

    // For WNBA, use ESPN API directly since BDL doesn't reliably support WNBA
    // and may return NBA games when league=wnba parameter is ignored
    const games = await this.espnGames();
    this.setCached(cacheKey, games);
    return games;
  }

  private espnCache: { games: Game[]; timestamp: number } | null = null;
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes in milliseconds

  private async espnGames(): Promise<Game[]> {
    // Check cache first
    if (this.espnCache && Date.now() - this.espnCache.timestamp < this.CACHE_TTL) {
      return this.espnCache.games;
    }

    try {
      // Fetch WNBA scoreboard from ESPN API
      const response = await axios.get('https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard', {
        timeout: 10000,
      });
      
      const data = response.data;
      const events = data.events || [];
      
      // Map ESPN events to Game interface
      const games: Game[] = events.map((event: any) => {
        const competition = event.competitions?.[0];
        const competitors = competition?.competitors || [];
        
        // Find home and away teams
        const homeTeam = competitors.find((c: any) => c.homeAway === 'home');
        const awayTeam = competitors.find((c: any) => c.homeAway === 'away');
        
        // Parse date
        const gameDate = new Date(event.date);
        const dateStr = gameDate.toISOString().split('T')[0];
        
        // Get status
        const status = competition?.status?.type?.id;
        let statusStr = 'Scheduled';
        if (status === '2') statusStr = 'In Progress';
        if (status === '3') statusStr = 'Final';
        
        return {
          id: parseInt(event.id) || 0,
          date: dateStr,
          home_team: {
            full_name: homeTeam?.team?.displayName || 'Unknown',
            abbreviation: homeTeam?.team?.abbreviation || 'UNK'
          },
          visitor_team: {
            full_name: awayTeam?.team?.displayName || 'Unknown',
            abbreviation: awayTeam?.team?.abbreviation || 'UNK'
          },
          home_team_score: parseInt(homeTeam?.score || '0'),
          visitor_team_score: parseInt(awayTeam?.score || '0'),
          status: statusStr,
          period: competition?.status?.period || 0,
          time: competition?.status?.displayClock || undefined
        };
      });
      
      // Filter to only include scheduled or in-progress games (not final)
      const filteredGames = games.filter(game => game.status !== 'Final');
      
      // Update cache
      this.espnCache = {
        games: filteredGames,
        timestamp: Date.now()
      };
      
      return filteredGames;
    } catch (error) {
      console.warn(`[WNBAAdapter] ESPN games fetch failed: ${error}`);
      // Return empty array as fallback
      return [];
    }
  }

  // ─── playerStats ───────────────────────────────────────────────────────────
  async playerStats(playerName: string, propType: StatKey): Promise<StatContext> {
    // WNBA stats logic would go here
    // For now, return minimal structure
    return {
      propLine: null,
      recentAvg5: 0,
      recentAvg10: 0,
      stdDev: 0,
      overHitRate: 0,
      streak: 0,
      recentGames: [],
      gamesPlayed: 0,
    };
  }

  // ─── compare ───────────────────────────────────────────────────────────────
  async compare(id1: number, id2: number, season: number): Promise<CompareResult> {
    // WNBA compare logic would go here
    return {
      player1: null,
      player2: null,
      head_to_head: [],
      effectiveSeason: season,
    };
  }

  // ─── photo ─────────────────────────────────────────────────────────────────
  async photo(playerName: string): Promise<string | null> {
    // WNBA photo logic would go here
    return null;
  }

  // ─── edgeFeed ──────────────────────────────────────────────────────────────
  async edgeFeed(options: {
    stat: StatKey;
    minMinutes: number;
    season: number;
  }): Promise<EdgeEntry[]> {
    // WNBA edge feed logic would go here
    return [];
  }
}
