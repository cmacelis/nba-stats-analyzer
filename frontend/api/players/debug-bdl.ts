import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, bdlGet, BDL_SEASON } from '../_lib.js';

/** GET /api/players/debug-bdl?player_id=115&season=2025
 *  Temporary diagnostic endpoint — returns raw BDL API results so we can
 *  see exactly what the API returns for a given player/season. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  const playerId = parseInt(req.query.player_id as string) || 115;
  const season   = parseInt(req.query.season   as string) || BDL_SEASON;

  try {
    const [avgResult, statsResult] = await Promise.allSettled([
      bdlGet('/season_averages', { player_id: playerId, season }),
      bdlGet('/stats', { 'player_ids[]': playerId, 'seasons[]': season, per_page: 5 }),
    ]);

    const avgData   = avgResult.status   === 'fulfilled' ? avgResult.value   : { error: (avgResult as PromiseRejectedResult).reason?.message };
    const statsData = statsResult.status === 'fulfilled' ? statsResult.value : { error: (statsResult as PromiseRejectedResult).reason?.message };

    res.json({
      player_id: playerId,
      season,
      season_averages_result: avgData,
      season_averages_count:  avgData?.data?.length ?? 'n/a',
      stats_sample_count:     statsData?.data?.length ?? 'n/a',
      stats_first_game:       statsData?.data?.[0] ?? null,
      stats_meta:             statsData?.meta ?? null,
      bdl_key_present:        !!process.env.BALL_DONT_LIE_API_KEY,
      bdl_key_prefix:         process.env.BALL_DONT_LIE_API_KEY?.slice(0, 8) ?? 'NOT_SET',
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
