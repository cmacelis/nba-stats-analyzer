import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib.js';

const NBA_ALL_PLAYERS_URL =
 'https://stats.nba.com/stats/commonallplayers?LeagueID=00&Season=2025-26&IsOnlyCurrentSeason=1';

function norm(s: string) {
 return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
 if (applyCors(req, res)) return;
 if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

 const name = String(req.query.name || '').trim();
 if (!name) return res.status(400).json({ error: 'Missing name' });

 try {
 // NBA Stats requires browser-like headers
 const r = await fetch(NBA_ALL_PLAYERS_URL, {
 headers: {
 'User-Agent': 'Mozilla/5.0',
 'Referer': 'https://www.nba.com/',
 'Origin': 'https://www.nba.com',
 'Accept': 'application/json, text/plain, */*',
 },
 });

 if (!r.ok) {
 return res.status(502).json({ error: 'NBA Stats upstream error', status: r.status });
 }

 const j = await r.json() as any;
 const rs = j?.resultSets?.[0];
 const headers: string[] = rs?.headers || [];
 const rows: any[] = rs?.rowSet || [];

 const idxName = headers.indexOf('DISPLAY_FIRST_LAST');
 const idxId = headers.indexOf('PERSON_ID');

 if (idxName < 0 || idxId < 0) {
 return res.status(500).json({ error: 'Unexpected NBA Stats schema' });
 }

 const target = norm(name);
 const match = rows.find(row => norm(String(row[idxName] || '')) === target);

 if (!match) {
 return res.json({ name, nba_person_id: null, photo_url: null });
 }

 const personId = Number(match[idxId]);
 const photoUrl = `https://cdn.nba.com/headshots/nba/latest/1040x760/${personId}.png`;

 return res.json({ name, nba_person_id: personId, photo_url: photoUrl });
 } catch (err) {
 console.error('[photo] error:', (err as Error).message);
 return res.status(500).json({ error: 'Failed to resolve photo' });
 }
}
