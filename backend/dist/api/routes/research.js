"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.researchRouter = void 0;
/**
 * Research API Routes
 * GET  /api/research/:playerName?prop=points
 * POST /api/research/generate
 */
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const scraper_1 = require("../../services/research/scraper");
const sentiment_1 = require("../../services/research/sentiment");
const synthesizer_1 = require("../../services/research/synthesizer");
exports.researchRouter = express_1.default.Router();
const BDL_KEY = process.env.BALL_DONT_LIE_API_KEY;
const BDL_BASE = 'https://api.balldontlie.io/v1';
const BDL_SEASON = 2024;
// Map prop type to BDL game-log stat key
const PROP_STAT = {
    points: 'pts',
    rebounds: 'reb',
    assists: 'ast',
};
// ── Helpers ───────────────────────────────────────────────────────────────────
function parseMins(min) {
    if (typeof min === 'number')
        return min;
    const parts = String(min || '0').split(':');
    return parseInt(parts[0]) + (parseInt(parts[1] || '0') / 60);
}
function stdDev(values) {
    if (values.length < 2)
        return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
}
function calcStreak(games, line) {
    if (games.length === 0)
        return 0;
    const dir = games[0] > line ? 1 : games[0] < line ? -1 : 0;
    if (dir === 0)
        return 0;
    let streak = 0;
    for (const g of games) {
        if ((dir > 0 && g > line) || (dir < 0 && g < line)) {
            streak += dir;
        }
        else {
            break;
        }
    }
    return streak;
}
// ── BDL Fetcher ───────────────────────────────────────────────────────────────
async function fetchStatContext(playerName, propType) {
    try {
        // 1. Find player ID (BDL search only matches single token — use first name)
        const firstName = playerName.split(' ')[0];
        console.log(`[research] Fetching BDL data for ${playerName} (${propType})`);
        const searchRes = await axios_1.default.get(`${BDL_BASE}/players`, {
            params: { search: firstName, per_page: 10 },
            headers: { Authorization: BDL_KEY },
            timeout: 8000,
        });
        const candidates = searchRes.data?.data ?? [];
        const lower = playerName.toLowerCase();
        const player = candidates.find(p => `${p.first_name} ${p.last_name}`.toLowerCase() === lower) ??
            candidates[0];
        if (!player) {
            console.warn(`[research] Player not found in BDL: ${playerName}`);
            return null;
        }
        console.log(`[research] Found player: ${player.first_name} ${player.last_name} (ID: ${player.id})`);
        const playerId = player.id;
        // 2. Season averages + last 15 game logs in parallel
        const [avgRes, logsRes] = await Promise.all([
            axios_1.default.get(`${BDL_BASE}/season_averages`, {
                params: { player_id: playerId, season: BDL_SEASON },
                headers: { Authorization: BDL_KEY },
                timeout: 8000,
            }),
            axios_1.default.get(`${BDL_BASE}/stats`, {
                params: {
                    'player_ids[]': playerId,
                    'seasons[]': BDL_SEASON,
                    per_page: 15,
                    sort: 'date',
                    direction: 'desc',
                },
                headers: { Authorization: BDL_KEY },
                timeout: 10000,
            }),
        ]);
        const avgRow = avgRes.data?.data?.[0];
        if (!avgRow) {
            console.warn(`[research] No season averages found for player ${player.id} season ${BDL_SEASON}`);
            return null;
        }
        console.log(`[research] Season avg fetched: pts=${avgRow.pts}, reb=${avgRow.reb}, ast=${avgRow.ast}`);
        // 3. Determine which stat to use
        const statKey = PROP_STAT[propType];
        let seasonAvg;
        if (propType === 'combined') {
            seasonAvg = (Number(avgRow.pts) || 0) + (Number(avgRow.reb) || 0) + (Number(avgRow.ast) || 0);
        }
        else if (statKey) {
            seasonAvg = Number(avgRow[statKey]) || 0;
        }
        else {
            return null;
        }
        // 4. Filter game logs: exclude DNP / garbage time (< 10 min played)
        const rawLogs = logsRes.data?.data ?? [];
        console.log(`[research] Total game logs fetched: ${rawLogs.length}`);
        const values = rawLogs
            .filter(g => parseMins(g.min) >= 10)
            .slice(0, 10)
            .map(g => {
            if (propType === 'combined') {
                return (Number(g.pts) || 0) + (Number(g.reb) || 0) + (Number(g.ast) || 0);
            }
            return Number(g[statKey]) || 0;
        });
        console.log(`[research] Qualified games (≥10 min): ${values.length}, values: ${values.join(',')}`);
        if (values.length < 3) {
            console.warn(`[research] Insufficient qualified games: ${values.length} < 3`);
            return null;
        }
        const recentAvg5 = values.slice(0, 5).reduce((a, b) => a + b, 0) / Math.min(5, values.length);
        const recentAvg10 = values.reduce((a, b) => a + b, 0) / values.length;
        const overHitRate = values.filter(v => v > seasonAvg).length / values.length;
        console.log(`[research] StatContext: season=${seasonAvg}, L5=${recentAvg5.toFixed(1)}, L10=${recentAvg10.toFixed(1)}, OHR=${(overHitRate * 100).toFixed(0)}%`);
        return {
            propLine: Math.round(seasonAvg * 10) / 10,
            recentAvg5: Math.round(recentAvg5 * 10) / 10,
            recentAvg10: Math.round(recentAvg10 * 10) / 10,
            stdDev: Math.round(stdDev(values) * 10) / 10,
            overHitRate: Math.round(overHitRate * 100) / 100,
            streak: calcStreak(values, seasonAvg),
            recentGames: values,
            gamesPlayed: Number(avgRow.games_played) || values.length,
        };
    }
    catch (err) {
        console.error('[research] fetchStatContext error:', err.message);
        return null;
    }
}
// ── Routes ────────────────────────────────────────────────────────────────────
// GET /api/research/:playerName — get (or generate) research report
exports.researchRouter.get('/:playerName', async (req, res) => {
    const { playerName } = req.params;
    const prop = req.query.prop || 'points';
    const forceRefresh = req.query.refresh === 'true';
    console.log(`\n[research] GET /${playerName} (prop=${prop}, refresh=${forceRefresh})`);
    if (!forceRefresh) {
        const cached = (0, synthesizer_1.getCachedReport)(playerName, prop);
        if (cached) {
            console.log(`[research] Returning cached report`);
            return res.json({ ...cached, cached: true });
        }
    }
    try {
        console.log(`[research] Fetching fresh data...`);
        const [mentions, statContext] = await Promise.all([
            (0, scraper_1.scrapePlayerMentions)(playerName),
            fetchStatContext(playerName, prop),
        ]);
        console.log(`[research] Mentions: ${mentions.length} (reddit=${mentions.filter(m => m.source === 'reddit').length}, espn=${mentions.filter(m => m.source === 'espn').length}, twitter=${mentions.filter(m => m.source === 'twitter').length})`);
        const sentiment = (0, sentiment_1.analyzeSentiment)(mentions);
        console.log(`[research] Sentiment: overall=${sentiment.overall_score.toFixed(2)}, volume=${sentiment.volume}, bullish=${sentiment.bullish_signals}, bearish=${sentiment.bearish_signals}`);
        const report = await (0, synthesizer_1.generateReport)(playerName, prop, mentions, sentiment, statContext);
        console.log(`[research] Report generated: pred=${report.prediction}, conf=${report.confidence.toFixed(2)}, simulated=${report.simulated}`);
        res.json({ ...report, statContext, cached: false });
    }
    catch (err) {
        console.error('[research] Error generating report:', err);
        res.status(500).json({ error: 'Failed to generate research report' });
    }
});
// POST /api/research/generate — generate report with custom data
exports.researchRouter.post('/generate', async (req, res) => {
    const { playerName, prop = 'points' } = req.body;
    if (!playerName)
        return res.status(400).json({ error: 'playerName is required' });
    try {
        const [mentions, statContext] = await Promise.all([
            (0, scraper_1.scrapePlayerMentions)(playerName),
            fetchStatContext(playerName, prop),
        ]);
        const sentiment = (0, sentiment_1.analyzeSentiment)(mentions);
        const report = await (0, synthesizer_1.generateReport)(playerName, prop, mentions, sentiment, statContext);
        res.json({ ...report, statContext });
    }
    catch (err) {
        console.error('[research] Error generating report:', err);
        res.status(500).json({ error: 'Failed to generate research report' });
    }
});
