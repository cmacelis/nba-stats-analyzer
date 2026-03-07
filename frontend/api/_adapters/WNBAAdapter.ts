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
    console.log('[WNBAAdapter.games] Cache check - cached:', cached ? cached.length : 0, 'items');
    if (cached) {
      console.log('[WNBAAdapter.games] Returning cached data');
      return cached;
    }

    // For WNBA, use ESPN API directly since BDL doesn't reliably support WNBA
    // and may return NBA games when league=wnba parameter is ignored
    console.log('[WNBAAdapter.games] Fetching WNBA schedule from ESPN API');
    const games = await this.espnGames();
    this.setCached(cacheKey, games);
    console.log(`[WNBAAdapter.games] Fetched ${games.length} WNBA games from ESPN`);
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
      console.log(`[WNBAAdapter.espnGames] ESPN API response status: ${response.status}, events: ${data.events?.length || 0}`);
      const events = data.events || [];
      console.log(`[WNBAAdapter.espnGames] Raw events count: ${events.length}`);
      
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
      console.log(`[WNBAAdapter.espnGames] After filtering: ${filteredGames.length} games`);
      
      // Update cache
      this.espnCache = {
        games: filteredGames,
        timestamp: Date.now()
      };
      
      return filteredGames;
    } catch (error: any) {
      console.warn(`[WNBAAdapter] ESPN games fetch failed: ${error}`);
      console.warn(`[WNBAAdapter] Error details: ${error.message}`);
      if (error.response) {
        console.warn(`[WNBAAdapter] ESPN API response status: ${error.response.status}`);
        console.warn(`[WNBAAdapter] ESPN API response data: ${JSON.stringify(error.response.data)}`);
      }
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
    console.log('[WNBAAdapter.edgeFeed] Fetching WNBA edges for', options);
    
    // For MVP: Return realistic WNBA edges with mock data
    // In future: Integrate with WNBA stats API for real game logs
    const cacheKey = `edge:${options.stat}:${options.season}`;
    const cached = this.getCached<EdgeEntry[]>(cacheKey, 10 * 60 * 1000); // 10 min cache
    if (cached) {
      console.log('[WNBAAdapter.edgeFeed] Returning cached edges:', cached.length);
      return cached;
    }
    
    // Mock WNBA players with realistic stats
    const wnbaPlayers = [
      { id: 1, name: 'Breanna Stewart', team: 'New York Liberty', abbrev: 'NY', basePts: 22.3, basePra: 28.5 },
      { id: 2, name: 'A\'ja Wilson', team: 'Las Vegas Aces', abbrev: 'LV', basePts: 23.8, basePra: 30.2 },
      { id: 3, name: 'Sabrina Ionescu', team: 'New York Liberty', abbrev: 'NY', basePts: 19.5, basePra: 25.7 },
      { id: 4, name: 'Kelsey Plum', team: 'Las Vegas Aces', abbrev: 'LV', basePts: 20.1, basePra: 26.3 },
      { id: 5, name: 'Chelsea Gray', team: 'Las Vegas Aces', abbrev: 'LV', basePts: 15.2, basePra: 22.8 },
      { id: 6, name: 'Jonquel Jones', team: 'New York Liberty', abbrev: 'NY', basePts: 17.8, basePra: 24.5 },
      { id: 7, name: 'DeWanna Bonner', team: 'Connecticut Sun', abbrev: 'CON', basePts: 18.3, basePra: 25.1 },
      { id: 8, name: 'Alyssa Thomas', team: 'Connecticut Sun', abbrev: 'CON', basePts: 16.2, basePra: 27.4 },
      { id: 9, name: 'Skylar Diggins-Smith', team: 'Seattle Storm', abbrev: 'SEA', basePts: 19.7, basePra: 25.9 },
      { id: 10, name: 'Jewell Loyd', team: 'Seattle Storm', abbrev: 'SEA', basePts: 21.4, basePra: 26.8 },
    ];
    
    // Generate edges with realistic deltas
    const edges: EdgeEntry[] = wnbaPlayers.map(player => {
      const baseStat = options.stat === 'pts' ? player.basePts : player.basePra;
      
      // Create realistic season average (slightly randomized around base)
      const seasonAvg = baseStat + (Math.random() * 2 - 1); // +/- 1
      
      // Create recent average with intentional delta for edge detection
      // Some players trending up, some down
      const trend = Math.random() > 0.5 ? 1 : -1;
      const deltaStrength = 1.5 + Math.random() * 2; // 1.5-3.5 delta
      const recentAvg = seasonAvg + (trend * deltaStrength);
      
      // Generate last 5 games
      const last5: number[] = [];
      for (let i = 0; i < 5; i++) {
        last5.push(recentAvg + (Math.random() * 4 - 2)); // +/- 2 variation
      }
      
      return {
        player_id: player.id,
        player_name: player.name,
        team: player.team,
        team_abbrev: player.abbrev,
        photo_url: null, // WNBA photos not configured yet
        season_avg: parseFloat(seasonAvg.toFixed(1)),
        recent_avg: parseFloat(recentAvg.toFixed(1)),
        delta: parseFloat((recentAvg - seasonAvg).toFixed(1)),
        last5: last5.map(n => parseFloat(n.toFixed(1))),
        games_played: 20 + Math.floor(Math.random() * 15), // 20-35 games
      };
    });
    
    // Filter by minMinutes (simulated)
    const filteredEdges = edges.filter(edge => 
      edge.games_played >= 10 && // Simulate minutes filter
      Math.abs(edge.delta) >= 1.5 // Minimum delta for edge detection
    );
    
    // Sort by absolute delta (biggest edges first)
    filteredEdges.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    
    console.log(`[WNBAAdapter.edgeFeed] Generated ${filteredEdges.length} WNBA edges`);
    this.setCached(cacheKey, filteredEdges);
    return filteredEdges;
  }
}
// Force rebuild
// FORCE REDEPLOY TIMESTAMP: 1772842055
