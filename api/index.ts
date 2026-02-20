import express from 'express';
import cors from 'cors';
import axios from 'axios';
import type { Request, Response } from 'express';

const app = express();

app.use(cors());
app.use(express.json());

const NBA_API_KEY = process.env.VITE_NBA_API_KEY;
const BDL_BASE = 'https://api.balldontlie.io/v1';
const BDL_HEADERS = { Authorization: NBA_API_KEY };

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
      headers: BDL_HEADERS,
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
        headers: BDL_HEADERS,
      }),
      axios.get(`${BDL_BASE}/season_averages`, {
        params: { player_ids: [id2], season: 2024 },
        headers: BDL_HEADERS,
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
  const season = parseInt(req.query.season as string) || 2024;
  try {
    const response = await axios.get(`${BDL_BASE}/season_averages`, {
      params: { player_ids: [req.params.id], season },
      headers: BDL_HEADERS,
    });
    const stats = response.data.data[0] ?? {};
    res.json(stats);
  } catch (error: unknown) {
    const e = error as { response?: { status: number; data: unknown } };
    const status = e.response?.status ?? 500;
    res.status(status).json({ error: 'Failed to fetch player stats', detail: e.response?.data });
  }
});

export default app;
