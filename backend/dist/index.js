"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const health_1 = require("./routes/health");
const players_1 = require("./routes/players");
const games_1 = require("./routes/games");
const research_1 = require("./api/routes/research");
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// CORS — in production set ALLOWED_ORIGINS to comma-separated Vercel domain(s)
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:5173'];
// Middleware
app.use((0, cors_1.default)({ origin: allowedOrigins, methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }));
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
// Routes
app.use('/api/health', health_1.healthRouter);
app.use('/api/players', players_1.playerRouter);
app.use('/api/games', games_1.gamesRouter);
app.use('/api/research', research_1.researchRouter);
// Root-level health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
