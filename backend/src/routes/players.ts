import express from 'express';
import type { Request, Response } from 'express';
import axios from 'axios';

const router = express.Router();

// The API key is safely stored in your backend's .env file
const NBA_API_KEY = process.env.VITE_NBA_API_KEY;

// 1. Search Players Route
router.get('/', async (req: Request, res: Response) => {
  const searchTerm = req.query.search as string;
  try {
    const response = await axios.get('https://api.balldontlie.io/v1/players', {
      params: { search: searchTerm },
      headers: { 'Authorization': NBA_API_KEY }
    });
    res.json(response.data); // Returns { data: [...], meta: {...} }
  } catch (error: any) {
    console.error('Error fetching from BallDontLie:', error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch player data' });
  }
});

// 2. Individual Player Stats Route
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const response = await axios.get('https://api.balldontlie.io/v1/season_averages', {
      params: { 
        player_ids: [req.params.id],
        season: 2023 
      },
      headers: { 'Authorization': NBA_API_KEY }
    });

    // Extracting the first item or an empty object to prevent frontend crashes
    const stats = response.data.data[0] || {};
    res.json(stats);
  } catch (error: any) {
    console.error('Stats fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch player stats' });
  }
});

router.get('/compare/:id1/:id2', async (req: Request, res: Response) => {
  const { id1, id2 } = req.params;
  
  try {
    const [stats1, stats2] = await Promise.all([
      axios.get('https://api.balldontlie.io/v1/season_averages', {
        params: { player_ids: [id1], season: 2023 },
        headers: { 'Authorization': NBA_API_KEY }
      }),
      axios.get('https://api.balldontlie.io/v1/season_averages', {
        params: { player_ids: [id2], season: 2023 },
        headers: { 'Authorization': NBA_API_KEY }
      })
    ]);

    // Match the exact property names expected by PlayerComparison.tsx
    res.json({
      player1: stats1.data.data[0] || {},
      player2: stats2.data.data[0] || {},
      head_to_head: [] 
    });
  } catch (error: any) {
    console.error('Comparison fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch comparison data' });
  }
});

    // Construct the object the frontend expects to prevent the 'player1' error
    res.json({
      player1_stats: stats1.data.data[0] || {},
      player2_stats: stats2.data.data[0] || {},
      head_to_head: [] // Placeholder for game history
    });
  } catch (error: any) {
    console.error('Comparison fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch comparison data' });
  }
});

export const playerRouter = router;