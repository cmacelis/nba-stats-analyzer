"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeEdgeFeed = computeEdgeFeed;
exports.default = handler;
const axios_1 = require("axios");
const _lib_js_1 = require("./_lib.js");
const AdapterFactory_js_1 = require("./_adapters/AdapterFactory.js");
const BDL_KEY = process.env.BALL_DONT_LIE_API_KEY;
// ── helpers ───────────────────────────────────────────────────────────────────
function parseMins(min) {
    if (typeof min === 'number')
        return min;
    const parts = String(min || '0').split(':');
    return parseInt(parts[0]) + (parseInt(parts[1] || '0') / 60);
}
/** Build a BDL GET request URL supporting array params (player_ids[], seasons[]). */
async function bdlBatch(path, params) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (Array.isArray(v))
            v.forEach(vi => sp.append(k, String(vi)));
        else
            sp.append(k, String(v));
    }
    const res = await axios_1.default.get(`${_lib_js_1.BDL_BASE}${path}?${sp.toString()}`, {
        headers: { Authorization: BDL_KEY },
        timeout: 15000,
    });
    return res.data;
}
let _playerCache = null;
const PLAYER_TTL = 24 * 60 * 60 * 1000;
async function getActivePlayers() {
    const now = Date.now();
    if (_playerCache && now - _playerCache.ts < PLAYER_TTL)
        return _playerCache.data;
    const raw = await bdlBatch('/players/active', { per_page: 30 });
    const data = raw?.data ?? [];
    _playerCache = { data, ts: Date.now() };
    return data;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function gameVal(game, stat) {
    if (stat === 'pra')
        return (Number(game.pts) || 0) + (Number(game.reb) || 0) + (Number(game.ast) || 0);
    return Number(game.pts) || 0;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function seasonVal(avg, stat) {
    if (!avg)
        return null;
    const v = stat === 'pra'
        ? (Number(avg.pts) || 0) + (Number(avg.reb) || 0) + (Number(avg.ast) || 0)
        : Number(avg.pts) || 0;
    return v > 0 ? v : null;
}
// ── core computation (exported for reuse by alerts endpoint) ──────────────────
/**
 * Computes the edge feed entries for a given stat/season without headshot enrichment.
 * Returns entries sorted by |delta| descending, capped at 20.
 * Pass a debugOut object to collect pipeline stage counts.
 */
async function computeEdgeFeed(stat, minMin, season, debugOut) {
    const players = await getActivePlayers();
    const ids = players.map(p => p.id);
    if (debugOut) {
        debugOut.active_players_count = players.length;
        debugOut.active_player_ids_sample = ids.slice(0, 5);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function captureErr(err, path) {
        const resp = err?.response;
        const status = resp?.status ?? null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = resp?.data;
        const bodyStr = body
            ? (typeof body === 'string' ? body : JSON.stringify(body)).slice(0, 200)
            : null;
        return { status, message: err?.message ?? String(err), url: `${_lib_js_1.BDL_BASE}${path}`, body_preview: bodyStr };
    }
    // Season averages endpoint only accepts a single player_id — not batch-compatible.
    // Instead, compute the season baseline directly from game logs:
    //   season_avg = mean of ALL fetched games for the player
    //   recent_avg = mean of the 5 most recent games
    // Two pages fetched in parallel (200 games = ~6-7 per player for 30 players).
    // Games are returned date-desc globally; per-player grouping preserves that order.
    let statsUpstreamErr = null;
    const statsParams = {
        'player_ids[]': ids,
        'seasons[]': [season],
        per_page: 100,
        sort: 'date',
        direction: 'desc',
    };
    const [res1, res2] = await Promise.all([
        bdlBatch('/stats', { ...statsParams, page: 1 })
            .catch((err) => { statsUpstreamErr = captureErr(err, '/stats'); return { data: [] }; }),
        bdlBatch('/stats', { ...statsParams, page: 2 })
            .catch(() => ({ data: [] })), // page 2 optional; page 1 error is the critical one
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const statsResData = [...(res1?.data ?? []), ...(res2?.data ?? [])];
    if (debugOut) {
        debugOut.season_averages_count = 0; // removed — computed from logs
        debugOut.season_averages_empty_reason = null;
        debugOut.season_averages_error = null;
        debugOut.stats_logs_count_total = statsResData.length;
        debugOut.stats_error = statsUpstreamErr;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gameMap = new Map();
    for (const g of statsResData) {
        const pid = g?.player?.id ?? g?.player_id;
        if (!pid || parseMins(g.min) < minMin)
            continue;
        if (!gameMap.has(pid))
            gameMap.set(pid, []);
        gameMap.get(pid).push(g);
    }
    if (debugOut) {
        debugOut.grouped_players_with_logs = [...gameMap.values()].filter(gs => gs.length >= 3).length;
        const sampleEntry = players.find(p => gameMap.has(p.id));
        if (sampleEntry) {
            const sampleGames = gameMap.get(sampleEntry.id);
            debugOut.stats_logs_count_sample_player = {
                player_id: sampleEntry.id,
                games: sampleGames.length,
                minutes_values: sampleGames.slice(0, 5).map(g => Math.round(parseMins(g.min) * 10) / 10),
            };
        }
        else {
            debugOut.stats_logs_count_sample_player = null;
        }
    }
    const entries = [];
    for (const p of players) {
        const games = gameMap.get(p.id) ?? [];
        if (games.length < 3)
            continue;
        // season_avg = mean of ALL fetched games (season-to-date baseline from logs)
        const allVals = games.map(g => gameVal(g, stat));
        const seasonAvg = Math.round((allVals.reduce((a, b) => a + b, 0) / allVals.length) * 10) / 10;
        // recent_avg = mean of 5 most recent games (array is date-desc)
        const last5Vals = allVals.slice(0, 5).map(v => Math.round(v * 10) / 10);
        const recentAvg = Math.round((last5Vals.reduce((a, b) => a + b, 0) / last5Vals.length) * 10) / 10;
        entries.push({
            player_id: p.id,
            player_name: `${p.first_name} ${p.last_name}`,
            team: p.team?.full_name ?? '—',
            team_abbrev: p.team?.abbreviation ?? '—',
            photo_url: null,
            season_avg: seasonAvg,
            recent_avg: recentAvg,
            delta: Math.round((recentAvg - seasonAvg) * 10) / 10,
            last5: last5Vals,
            games_played: games.length,
        });
    }
    if (debugOut) {
        debugOut.final_candidates_before_sort = entries.length;
    }
    entries.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    const result = entries.slice(0, 20);
    if (debugOut) {
        debugOut.final_returned = result.length;
    }
    return result;
}
// ── handler ───────────────────────────────────────────────────────────────────
async function handler(req, res) {
    if ((0, _lib_js_1.applyCors)(req, res))
        return;
    const stat = (req.query.stat || 'pts');
    const minMin = parseFloat(req.query.min_minutes) || 20;
    const season = parseInt(req.query.season) || _lib_js_1.BDL_SEASON;
    const isDebug = req.query.debug === '1';
    const debugOut = isDebug ? {
        active_players_count: 0,
        active_player_ids_sample: [],
        season_averages_count: 0,
        season_averages_empty_reason: null,
        season_averages_error: null,
        stats_logs_count_total: 0,
        stats_error: null,
        stats_logs_count_sample_player: null,
        grouped_players_with_logs: 0,
        final_candidates_before_sort: 0,
        final_returned: 0,
    } : undefined;
    try {
        // Debug mode uses computeEdgeFeed directly to capture pipeline diagnostics.
        // Production path goes through the adapter (zero behaviour change — NBAAdapter calls computeEdgeFeed internally).
        const league = req.league || 'nba';
        const top = isDebug
            ? await computeEdgeFeed(stat, minMin, season, debugOut)
            : (await AdapterFactory_js_1.AdapterFactory.get(league).edgeFeed({ stat, minMinutes: minMin, season }));
        // Enrich with headshots (in parallel, non-fatal)
        await Promise.all(top.map(async (e) => {
            try {
                const pid = await (0, _lib_js_1.findNbaPersonId)(e.player_name);
                if (pid)
                    e.photo_url = (0, _lib_js_1.buildNbaPhotoUrl)(pid);
            }
            catch { /* silent */ }
        }));
        res.json({
            data: top,
            stat,
            season,
            generated_at: new Date().toISOString(),
            ...(isDebug && { debug: debugOut }),
        });
    }
    catch (err) {
        console.error('[edge] error:', err.message);
        res.status(500).json({ error: 'Failed to generate edge feed' });
    }
}
