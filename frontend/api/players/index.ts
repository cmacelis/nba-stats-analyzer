import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, searchPlayers } from '../_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  const search = (req.query.search as string) || '';
  if (!search) return res.status(400).json({ error: 'search query param is required' });

  try {
    const result = await searchPlayers(search);
    res.json(result);
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = err as any;
    if (e?.response?.status === 401) {
      return res.status(402).json({ error: 'plan_required', message: 'Player search requires a valid BallDontLie API key.' });
    }
    console.error('[players] error:', e?.message);
    res.status(500).json({ error: 'Failed to fetch player data' });
  }
}
