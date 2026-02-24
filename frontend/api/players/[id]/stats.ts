import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, bdlGet, BDL_SEASON } from '../../../_lib.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  const id     = req.query.id as string;
  const season = parseInt(req.query.season as string) || BDL_SEASON;

  try {
    const data = await bdlGet('/season_averages', { player_id: parseInt(id), season });
    res.json(data?.data?.[0] ?? {});
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = err as any;
    if (e?.response?.status === 401) {
      return res.status(402).json({ error: 'plan_required', message: 'Season stats require a BallDontLie Starter plan.' });
    }
    console.error('[player-stats] error:', e?.message);
    res.status(500).json({ error: 'Failed to fetch player stats' });
  }
}
