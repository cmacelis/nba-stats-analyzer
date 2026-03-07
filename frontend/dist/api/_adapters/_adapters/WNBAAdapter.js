"use strict";
/**
 * WNBAAdapter — Phase 1
 *
 * Minimal adapter for WNBA support.
 * Data Source Policy:
 * 1. Try BallDontLie first for WNBA if supported by the plan
 * 2. If unsupported/incomplete, fallback to ESPN WNBA schedule + player search
 * 3. Cache responses (players: 24h, games: 10–60 min)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WNBAAdapter = void 0;
const _lib_js_1 = require("../_lib.js");
const axios_1 = require("axios");
class WNBAAdapter {
    constructor() {
        this.league = 'wnba';
        this.cache = new Map();
        this.espnCache = null;
        this.CACHE_TTL = 10 * 60 * 1000; // 10 minutes in milliseconds
    }
    getCached(key, ttlMs) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (Date.now() - entry.timestamp > ttlMs) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    setCached(key, data) {
        this.cache.set(key, { data, timestamp: Date.now() });
    }
    // ─── playerSearch ──────────────────────────────────────────────────────────
    async playerSearch(query) {
        const cacheKey = `playerSearch:${query}`;
        const cached = this.getCached(cacheKey, 24 * 60 * 60 * 1000); // 24h
        if (cached)
            return cached;
        try {
            // Try BallDontLie first
            const result = await (0, _lib_js_1.searchPlayers)(query, this.league);
            const enriched = await Promise.all(result.data.map(async (p) => {
                const fullName = `${p.first_name} ${p.last_name}`;
                // Note: WNBA player photos may need different logic
                const personId = await (0, _lib_js_1.findNbaPersonId)(fullName).catch(() => null);
                return { ...p, photo_url: personId != null ? (0, _lib_js_1.buildNbaPhotoUrl)(personId) : null };
            }));
            const response = { ...result, data: enriched };
            this.setCached(cacheKey, response);
            return response;
        }
        catch (error) {
            // If BDL fails, fallback to ESPN
            console.warn(`[WNBAAdapter] BDL player search failed, falling back to ESPN: ${error}`);
            return this.espnPlayerSearch(query);
        }
    }
    async espnPlayerSearch(query) {
        // ESPN fallback implementation
        // For now, return empty results
        return {
            data: [],
            meta: { source: 'espn_fallback', query }
        };
    }
    // ─── games ─────────────────────────────────────────────────────────────────
    async games() {
        const cacheKey = 'games';
        const cached = this.getCached(cacheKey, 10 * 60 * 1000); // 10 min
        if (cached)
            return cached;
        // TEMPORARY FIX: Return empty array until ESPN integration is fully tested
        // This prevents WNBA endpoint from returning NBA games
        console.log('[WNBAAdapter.games] Returning empty array (WNBA schedule not configured)');
        const games = [];
        this.setCached(cacheKey, games);
        return games;
        // TODO: Uncomment when ESPN integration is ready
        // For WNBA, use ESPN API directly since BDL doesn't reliably support WNBA
        // and may return NBA games when league=wnba parameter is ignored
        // const games = await this.espnGames();
        // this.setCached(cacheKey, games);
        // return games;
    }
    async espnGames() {
        // Check cache first
        if (this.espnCache && Date.now() - this.espnCache.timestamp < this.CACHE_TTL) {
            return this.espnCache.games;
        }
        try {
            // Fetch WNBA scoreboard from ESPN API
            const response = await axios_1.default.get('https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard', {
                timeout: 10000,
            });
            const data = response.data;
            console.log(`[WNBAAdapter.espnGames] ESPN API response status: ${response.status}, events: ${data.events?.length || 0}`);
            const events = data.events || [];
            // Map ESPN events to Game interface
            const games = events.map((event) => {
                const competition = event.competitions?.[0];
                const competitors = competition?.competitors || [];
                // Find home and away teams
                const homeTeam = competitors.find((c) => c.homeAway === 'home');
                const awayTeam = competitors.find((c) => c.homeAway === 'away');
                // Parse date
                const gameDate = new Date(event.date);
                const dateStr = gameDate.toISOString().split('T')[0];
                // Get status
                const status = competition?.status?.type?.id;
                let statusStr = 'Scheduled';
                if (status === '2')
                    statusStr = 'In Progress';
                if (status === '3')
                    statusStr = 'Final';
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
        }
        catch (error) {
            console.warn(`[WNBAAdapter] ESPN games fetch failed: ${error}`);
            // Return empty array as fallback
            return [];
        }
    }
    // ─── playerStats ───────────────────────────────────────────────────────────
    async playerStats(playerName, propType) {
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
    async compare(id1, id2, season) {
        // WNBA compare logic would go here
        return {
            player1: null,
            player2: null,
            head_to_head: [],
            effectiveSeason: season,
        };
    }
    // ─── photo ─────────────────────────────────────────────────────────────────
    async photo(playerName) {
        // WNBA photo logic would go here
        return null;
    }
    // ─── edgeFeed ──────────────────────────────────────────────────────────────
    async edgeFeed(options) {
        // WNBA edge feed logic would go here
        return [];
    }
}
exports.WNBAAdapter = WNBAAdapter;
// Force rebuild
