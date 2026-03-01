"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gamesRouter = void 0;
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const router = express_1.default.Router();
const NBA_API_KEY = process.env.BALL_DONT_LIE_API_KEY;
router.get('/', async (_req, res) => {
    const today = new Date();
    const end = new Date(today);
    end.setDate(today.getDate() + 3);
    const fmt = (d) => d.toISOString().slice(0, 10);
    try {
        const response = await axios_1.default.get('https://api.balldontlie.io/v1/games', {
            params: { start_date: fmt(today), end_date: fmt(end), per_page: 25 },
            headers: { Authorization: NBA_API_KEY },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const games = (response.data.data ?? []).filter((g) => g.status !== 'Final');
        res.json({ data: games });
    }
    catch (error) {
        console.error('Games fetch error:', error.message);
        res.status(error.response?.status ?? 500).json({ error: 'Failed to fetch games' });
    }
});
exports.gamesRouter = router;
