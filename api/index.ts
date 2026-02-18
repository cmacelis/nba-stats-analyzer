import express from 'express';
import cors from 'cors';
import axios from 'axios';
import type { Request, Response } from 'express';

const app = express();

app.use(cors());
app.use(express.json());

const NBA_API_KEY = process.env.VITE_NBA_API_KEY;

// Health
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Search players
app.get('/api/players', async (req: Request, res: Response) => {
  const searchTerm = req.query.search as string;
  try {
    const response = await axios.get('https://api.balldontlie.io/v1/players', {
      params: { search: searchTerm },
      headers: { Authorization: NBA_API_KEY },
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
      axios.get('https://api.balldontlie.io/v1/season_averages', {
        params: { player_ids: [id1], season: 2024 },
        headers: { Authorization: NBA_API_KEY },
      }),
      axios.get('https://api.balldontlie.io/v1/season_averages', {
        params: { player_ids: [id2], season: 2024 },
        headers: { Authorization: NBA_API_KEY },
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
    const response = await axios.get('https://api.balldontlie.io/v1/season_averages', {
      params: { player_ids: [req.params.id], season: 2024 },
      headers: { Authorization: NBA_API_KEY },
    });
    const stats = response.data.data[0] ?? {};
    res.json(stats);
  } catch {
    res.status(500).json({ error: 'Failed to fetch player stats' });
  }
});

export default app;
