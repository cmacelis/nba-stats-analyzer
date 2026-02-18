import express from 'express';
import cors from 'cors';
import axios from 'axios';
import type { Request, Response } from 'express';

const app = express();

app.use(cors());
app.use(express.json());

const NBA_API_KEY = process.env.XRapidAPIKey;
const RAPIDAPI_HOST = 'balldontlie.p.rapidapi.com';
const RAPIDAPI_HEADERS = { 'X-RapidAPI-Key': NBA_API_KEY, 'X-RapidAPI-Host': RAPIDAPI_HOST };
const BDL_BASE = `https://${RAPIDAPI_HOST}/v1`;

// Health
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Search players
app.get('/api/players', async (req: Request, res: Response) => {
  const searchTerm = req.query.search as string;
  try {
    const response = await axios.get(`${BDL_BASE}/players`, {
      params: { search: searchTerm },
      headers: RAPIDAPI_HEADERS,
    });
    res.json(response.data);
  } catch (error: unknown) {
    const status = (error as { response?: { status: number } }).response?.status ?? 500;
    res.status(status).json({ error: 'Failed to fetch player data' });
  }
});

// Compare players — must come before /:id/stats to avoid route shadowing
app.get('/api/players/compare/:id1/:id2', async (req: Request, res: Response) => {
  const { id1, id2 } = req.params;
  try {
    const [stats1, stats2] = await Promise.all([
      axios.get(`${BDL_BASE}/season_averages`, {
        params: { player_ids: [id1], season: 2024 },
        headers: RAPIDAPI_HEADERS,
      }),
      axios.get(`${BDL_BASE}/season_averages`, {
        params: { player_ids: [id2], season: 2024 },
        headers: RAPIDAPI_HEADERS,
      }),
    ]);
    res.json({
      player1: stats1.data.data[0] ?? null,
      player2: stats2.data.data[0] ?? null,
      head_to_head: [],
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch comparison data' });
  }
});

// Individual player stats
app.get('/api/players/:id/stats', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${BDL_BASE}/season_averages`, {
      params: { player_ids: [req.params.id], season: 2024 },
      headers: RAPIDAPI_HEADERS,
    });
    const stats = response.data.data[0] ?? {};
    res.json(stats);
  } catch {
    res.status(500).json({ error: 'Failed to fetch player stats' });
  }
});

export default app;
