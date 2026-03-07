/**
 * GET /api/alerts/rules/list?userId={discordUserId}
 * List all alert rules for a specific user.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../_lib.js';
import { queryDocuments } from '../_firebase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId query parameter is required' });

    const docs = await queryDocuments('alert_rules', [
      { field: 'userId', op: 'EQUAL', value: userId },
    ]);

    const rules = docs.map(d => ({
      id: d.id,
      userId: d.userId,
      league: d.league,
      playerId: d.playerId || null,
      playerName: d.playerName || null,
      stat: d.stat,
      direction: d.direction,
      minDelta: d.minDelta,
      minMinutes: d.minMinutes,
      enabled: d.enabled !== false,
      createdAt: d.createdAt,
      lastTriggered: d.lastTriggered || null,
    }));

    rules.sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());

    return res.json({ success: true, count: rules.length, rules });
  } catch (error) {
    console.error('[alerts/rules/list] error:', error);
    return res.status(500).json({ error: 'Failed to list rules', detail: (error as Error).message });
  }
}
