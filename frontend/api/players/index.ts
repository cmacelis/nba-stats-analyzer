import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, searchPlayers, findNbaPersonId, buildNbaPhotoUrl, BdlPlayer } from '../_lib.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (applyCors(req, res)) return;

    const search = (req.query.search as string) || '';
    if (!search) return res.status(400).json({ error: 'search query param is required' });

    const result = await searchPlayers(search);
    const enriched = await Promise.all(
      result.data.map(async (p: BdlPlayer) => {
        const fullName = `${p.first_name} ${p.last_name}`;
        const personId = await findNbaPersonId(fullName).catch(() => null);
        return { ...p, photo_url: personId != null ? buildNbaPhotoUrl(personId) : null };
      })
    );
    res.json({ ...result, data: enriched });
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = err as any;
    if (e?.response?.status === 401) {
      return res.status(402).json({ error: 'plan_required', message: 'Player search requires a valid BallDontLie API key.' });
    }
    console.error('[players] error:', e?.message);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to fetch player data', detail: String(err) });
  }
}
