import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, bdlGet, BDL_SEASON } from '../../../../_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  const id1    = req.query.id1 as string;
  const id2    = req.query.id2 as string;
  const season = parseInt(req.query.season as string) || BDL_SEASON;

  try {
    const [r1, r2] = await Promise.all([
      bdlGet('/season_averages', { player_id: parseInt(id1), season }),
      bdlGet('/season_averages', { player_id: parseInt(id2), season }),
    ]);
    res.json({
      player1:      r1?.data?.[0] ?? null,
      player2:      r2?.data?.[0] ?? null,
      head_to_head: [],
    });
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = err as any;
    if (e?.response?.status === 401) {
      return res.status(402).json({ error: 'plan_required', message: 'Season stats require a BallDontLie Starter plan.' });
    }
    console.error('[compare] error:', e?.message);
    res.status(500).json({ error: 'Failed to fetch comparison data' });
  }
}
