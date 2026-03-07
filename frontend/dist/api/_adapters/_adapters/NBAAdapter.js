"use strict";
/**
 * NBAAdapter — Sprint A
 *
 * Thin wrapper around the existing _lib.ts helpers and edge-feed function.
 * All methods replicate the exact logic already in production handlers;
 * no new APIs, no new env vars, no behavior change.
 *
 * Phase 1 will swap internals for richer NBA-specific pipelines.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NBAAdapter = void 0;
const _lib_js_1 = require("../_lib.js");
const edge_js_1 = require("../edge.js");
class NBAAdapter {
    // ─── playerSearch ──────────────────────────────────────────────────────────
    // Mirrors _handlers/players.ts exactly:
    //   searchPlayers() → BDL envelope → enrich data[] with photo_url → { ...result, data: enriched }
    async playerSearch(_query) {
        const result = await (0, _lib_js_1.searchPlayers)(_query, 'nba');
        const enriched = await Promise.all(result.data.map(async (p) => {
            const fullName = `${p.first_name} ${p.last_name}`;
            const personId = await (0, _lib_js_1.findNbaPersonId)(fullName).catch(() => null);
            return { ...p, photo_url: personId != null ? (0, _lib_js_1.buildNbaPhotoUrl)(personId) : null };
        }));
        return { ...result, data: enriched };
    }
    // ─── games ─────────────────────────────────────────────────────────────────
    // Mirrors _handlers/games.ts exactly:
    //   single BDL call with start_date/end_date range, per_page:25, filter non-Final
    async games() {
        const today = new Date();
        const end = new Date(today);
        end.setDate(today.getDate() + 3);
        const fmt = (d) => d.toISOString().slice(0, 10);
        const data = await (0, _lib_js_1.bdlGet)('/games', {
            start_date: fmt(today),
            end_date: fmt(end),
            per_page: 25,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (data?.data ?? []).filter((g) => g.status !== 'Final');
    }
    // ─── playerStats ───────────────────────────────────────────────────────────
    async playerStats(playerName, propType) {
        return (0, _lib_js_1.fetchStatContext)(playerName, propType);
    }
    // ─── compare ───────────────────────────────────────────────────────────────
    // Mirrors _handlers/compare.ts: fetch both seasons, fall back to prev season
    // if either player has no data, to keep results consistent.
    async compare(id1, id2, season) {
        const [r1, r2] = await Promise.all([
            (0, _lib_js_1.bdlGet)('/season_averages', { season, player_id: id1 }),
            (0, _lib_js_1.bdlGet)('/season_averages', { season, player_id: id2 }),
        ]);
        let player1 = r1.data?.[0] ?? null;
        let player2 = r2.data?.[0] ?? null;
        let effectiveSeason = season;
        if (!player1 || !player2) {
            const prev = season - 1;
            const [f1, f2] = await Promise.all([
                (0, _lib_js_1.bdlGet)('/season_averages', { season: prev, player_id: id1 }),
                (0, _lib_js_1.bdlGet)('/season_averages', { season: prev, player_id: id2 }),
            ]);
            player1 = f1.data?.[0] ?? null;
            player2 = f2.data?.[0] ?? null;
            effectiveSeason = prev;
        }
        return { player1, player2, head_to_head: [], effectiveSeason };
    }
    // ─── photo ─────────────────────────────────────────────────────────────────
    async photo(playerName) {
        const personId = await (0, _lib_js_1.findNbaPersonId)(playerName).catch(() => null);
        return personId ? (0, _lib_js_1.buildNbaPhotoUrl)(personId) : null;
    }
    // ─── edgeFeed ──────────────────────────────────────────────────────────────
    async edgeFeed(options) {
        return (0, edge_js_1.computeEdgeFeed)(options.stat, options.minMinutes, options.season);
    }
}
exports.NBAAdapter = NBAAdapter;
