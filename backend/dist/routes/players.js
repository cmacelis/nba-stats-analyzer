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
const NBA_API_KEY = process.env.VITE_NBA_API_KEY;
/**
 * 1. Search Players Route
 * Path: GET /api/players?search=name
 */
router.get('/', async (req, res) => {
    const searchTerm = req.query.search;
    try {
        const response = await axios_1.default.get('https://api.balldontlie.io/v1/players', {
            params: { search: searchTerm },
            headers: { 'Authorization': NBA_API_KEY }
        });
        // Returns the standard BallDontLie structure { data: [...], meta: {...} }
        res.json(response.data);
    }
    catch (error) {
        console.error('Error fetching from BallDontLie:', error.message);
        res.status(error.response?.status || 500).json({ error: 'Failed to fetch player data' });
    }
});
/**
 * 2. Comparison Route — defined before /:id/stats to prevent route shadowing
 * Path: GET /api/players/compare/:id1/:id2
 */
router.get('/compare/:id1/:id2', async (req, res) => {
    const { id1, id2 } = req.params;
    try {
        // Fetch both players' stats at the same time for performance
        const [stats1, stats2] = await Promise.all([
            axios_1.default.get('https://api.balldontlie.io/v1/season_averages', {
                params: { player_ids: [id1], season: 2024 },
                headers: { 'Authorization': NBA_API_KEY }
            }),
            axios_1.default.get('https://api.balldontlie.io/v1/season_averages', {
                params: { player_ids: [id2], season: 2024 },
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
        console.error('Comparison fetch error:', error.message);
        res.status(500).json({ error: 'Failed to fetch comparison data' });
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
                player_ids: [req.params.id],
                season
            },
            headers: { 'Authorization': NBA_API_KEY }
        });
        const stats = response.data.data[0] || {};
        res.json(stats);
    }
    catch (error) {
        console.error('Stats fetch error:', error.message);
        res.status(500).json({ error: 'Failed to fetch player stats' });
    }
});
exports.playerRouter = router;
