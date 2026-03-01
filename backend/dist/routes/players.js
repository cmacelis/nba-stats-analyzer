"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.playerRouter = void 0;
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const router = express_1.default.Router();
// The API key is safely stored in your backend's .env file
const NBA_API_KEY = process.env.BALL_DONT_LIE_API_KEY;
/**
 * 1. Search Players Route
 * Path: GET /api/players?search=name
 */
router.get('/', async (req, res) => {
    const searchTerm = req.query.search || '';
    try {
        // BDL search only matches single tokens — search by first name, then filter
        const firstName = searchTerm.split(' ')[0];
        const response = await axios_1.default.get('https://api.balldontlie.io/v1/players', {
            params: { search: firstName, per_page: 25 },
            headers: { 'Authorization': NBA_API_KEY }
        });
        const allPlayers = response.data?.data ?? [];
        // If query was a full name, narrow to exact match; otherwise return all results
        const isFullName = searchTerm.includes(' ');
        const lower = searchTerm.toLowerCase();
        const filtered = isFullName
            ? allPlayers.filter((p) => `${p.first_name} ${p.last_name}`.toLowerCase() === lower)
            : allPlayers;
        res.json({ ...response.data, data: filtered });
    }
    catch (error) {
        if (error.response?.status === 401) {
            res.status(402).json({ error: 'plan_required', message: 'Player search requires a valid BallDontLie API key.' });
        }
        else {
            console.error('Error fetching from BallDontLie:', error.message);
            res.status(error.response?.status || 500).json({ error: 'Failed to fetch player data' });
        }
    }
});
/**
 * 2. Comparison Route — defined before /:id/stats to prevent route shadowing
 * Path: GET /api/players/compare/:id1/:id2
 */
router.get('/compare/:id1/:id2', async (req, res) => {
    const { id1, id2 } = req.params;
    const season = parseInt(req.query.season) || 2024;
    try {
        // Fetch both players' stats at the same time for performance
        const [stats1, stats2] = await Promise.all([
            axios_1.default.get('https://api.balldontlie.io/v1/season_averages', {
                params: { player_id: parseInt(id1), season },
                headers: { 'Authorization': NBA_API_KEY }
            }),
            axios_1.default.get('https://api.balldontlie.io/v1/season_averages', {
                params: { player_id: parseInt(id2), season },
                headers: { 'Authorization': NBA_API_KEY }
            })
        ]);
        // Construct the object exactly as the frontend expects it
        res.json({
            player1: stats1.data.data[0] || null,
            player2: stats2.data.data[0] || null,
            head_to_head: []
        });
    }
    catch (error) {
        if (error.response?.status === 401) {
            res.status(402).json({ error: 'plan_required', message: 'Season stats require a BallDontLie Starter plan.' });
        }
        else {
            console.error('Comparison fetch error:', error.message);
            res.status(500).json({ error: 'Failed to fetch comparison data' });
        }
    }
});
/**
 * 3. Individual Player Stats Route
 * Path: GET /api/players/:id/stats
 */
router.get('/:id/stats', async (req, res) => {
    const season = parseInt(req.query.season) || 2024;
    try {
        const response = await axios_1.default.get('https://api.balldontlie.io/v1/season_averages', {
            params: {
                player_id: parseInt(req.params.id),
                season
            },
            headers: { 'Authorization': NBA_API_KEY }
        });
        const stats = response.data.data[0] || {};
        res.json(stats);
    }
    catch (error) {
        if (error.response?.status === 401) {
            res.status(402).json({ error: 'plan_required', message: 'Season stats require a BallDontLie Starter plan.' });
        }
        else {
            console.error('Stats fetch error:', error.message);
            res.status(500).json({ error: 'Failed to fetch player stats' });
        }
    }
});
exports.playerRouter = router;
