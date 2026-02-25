import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, getSeasonAverages, BDL_SEASON } from '../../../_lib.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  const id1    = req.query.id1 as string;
  const id2    = req.query.id2 as string;
  const season = parseInt(req.query.season as string) || BDL_SEASON;

  try {
    let [player1, player2] = await Promise.all([
      getSeasonAverages(parseInt(id1), season),
      getSeasonAverages(parseInt(id2), season),
    ]);

    // If either player has no data for the requested season, try the previous season for both
    // (keeps comparison consistent — same season for both players)
    let effectiveSeason = season;
    if (!player1 || !player2) {
      effectiveSeason = season - 1;
      const [fb1, fb2] = await Promise.all([
        getSeasonAverages(parseInt(id1), effectiveSeason),
        getSeasonAverages(parseInt(id2), effectiveSeason),
      ]);
      player1 = fb1;
      player2 = fb2;
    }

    res.json({ player1, player2, head_to_head: [], effectiveSeason });
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
