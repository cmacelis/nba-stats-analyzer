/**
 * GET /api/alerts/rules/list?userId={discordUserId}
 * List all alert rules for a specific user.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../_lib.js';
import { db } from '../_firebase.js';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId query parameter is required' });

    const rulesRef = collection(db, 'alert_rules');
    const q = query(rulesRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    const rules = querySnapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id, userId: data.userId, league: data.league,
        playerId: data.playerId || null, playerName: data.playerName || null,
        stat: data.stat, direction: data.direction,
        minDelta: data.minDelta, minMinutes: data.minMinutes,
        enabled: data.enabled !== false,
        createdAt: data.createdAt, lastTriggered: data.lastTriggered || null,
      };
    });

    rules.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({ success: true, count: rules.length, rules });
  } catch (error) {
    console.error('[alerts/rules/list] error:', error);
    return res.status(500).json({ error: 'Failed to list rules', detail: (error as Error).message });
  }
}
