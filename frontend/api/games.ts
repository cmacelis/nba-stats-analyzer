import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, bdlGet } from './_lib.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  const today = new Date();
  const end   = new Date(today);
  end.setDate(today.getDate() + 3);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  try {
    const data = await bdlGet('/games', {
      start_date: fmt(today),
      end_date:   fmt(end),
      per_page:   25,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const games = (data?.data ?? []).filter((g: any) => g.status !== 'Final');
    res.json({ data: games });
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = err as any;
    const status = e?.response?.status;
    console.error('[games] error:', e?.message, 'HTTP status:', status);
    res.status(500).json({ error: 'Failed to fetch games', detail: String(err), bdlStatus: status });
  }
}
