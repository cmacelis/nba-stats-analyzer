import express from 'express';
import type { Request, Response } from 'express';
import axios from 'axios';

const router = express.Router();

// The API key is safely stored in your backend's .env file
const NBA_API_KEY = process.env.VITE_NBA_API_KEY;

/**
 * 1. Search Players Route
 * Path: GET /api/players?search=name
 */
router.get('/', async (req: Request, res: Response) => {
  const searchTerm = req.query.search as string;

  try {
    const response = await axios.get('https://api.balldontlie.io/v1/players', {
      params: { search: searchTerm },
      headers: { 'Authorization': NBA_API_KEY }
    });

    // Returns the standard BallDontLie structure { data: [...], meta: {...} }
    res.json(response.data);
  } catch (error: any) {
    console.error('Error fetching from BallDontLie:', error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch player data' });
  }
});

/**
 * 2. Comparison Route — defined before /:id/stats to prevent route shadowing
 * Path: GET /api/players/compare/:id1/:id2
 */
router.get('/compare/:id1/:id2', async (req: Request, res: Response) => {
  const { id1, id2 } = req.params;

  try {
    // Fetch both players' stats at the same time for performance
    const [stats1, stats2] = await Promise.all([
      axios.get('https://api.balldontlie.io/v1/season_averages', {
        params: { player_ids: [id1], season: 2024 },
        headers: { 'Authorization': NBA_API_KEY }
      }),
      axios.get('https://api.balldontlie.io/v1/season_averages', {
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
  } catch (error: any) {
    if (error.response?.status === 401) {
      res.status(402).json({ error: 'plan_required', message: 'Season stats require a BallDontLie Starter plan.' });
    } else {
      console.error('Comparison fetch error:', error.message);
      res.status(500).json({ error: 'Failed to fetch comparison data' });
    }
  }
});

/**
 * 3. Individual Player Stats Route
 * Path: GET /api/players/:id/stats
 */
router.get('/:id/stats', async (req: Request, res: Response) => {
  const season = parseInt(req.query.season as string) || 2024;
  try {
    const response = await axios.get('https://api.balldontlie.io/v1/season_averages', {
      params: {
        player_ids: [req.params.id],
        season
      },
      headers: { 'Authorization': NBA_API_KEY }
    });

    const stats = response.data.data[0] || {};
    res.json(stats);
  } catch (error: any) {
    if (error.response?.status === 401) {
      res.status(402).json({ error: 'plan_required', message: 'Season stats require a BallDontLie Starter plan.' });
    } else {
      console.error('Stats fetch error:', error.message);
      res.status(500).json({ error: 'Failed to fetch player stats' });
    }
  }
});

export const playerRouter = router;