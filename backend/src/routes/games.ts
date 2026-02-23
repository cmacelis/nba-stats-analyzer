import express from 'express';
import type { Request, Response } from 'express';
import axios from 'axios';

const router = express.Router();
const NBA_API_KEY = process.env.BALL_DONT_LIE_API_KEY;

router.get('/', async (_req: Request, res: Response) => {
  const today = new Date();
  const end = new Date(today);
  end.setDate(today.getDate() + 3);
  const fmt = (d: Date): string => d.toISOString().slice(0, 10);
  try {
    const response = await axios.get('https://api.balldontlie.io/v1/games', {
      params: { start_date: fmt(today), end_date: fmt(end), per_page: 25 },
      headers: { Authorization: NBA_API_KEY },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const games = (response.data.data ?? []).filter((g: any) => g.status !== 'Final');
    res.json({ data: games });
  } catch (error: any) {
    console.error('Games fetch error:', error.message);
    res.status(error.response?.status ?? 500).json({ error: 'Failed to fetch games' });
  }
});

export const gamesRouter = router;
