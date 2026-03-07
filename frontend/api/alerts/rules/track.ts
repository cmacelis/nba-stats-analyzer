/**
 * POST /api/alerts/rules/track
 * Create a new personalized alert rule for a user.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../_lib.js';
import { db } from '../_firebase.js';
import { collection, addDoc } from 'firebase/firestore';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { userId, league, playerId, playerName, stat, direction, minDelta, minMinutes } = req.body;

    if (!userId || !league || !stat || !direction) {
      return res.status(400).json({ error: 'Missing required fields: userId, league, stat, direction' });
    }
    if (!['nba', 'wnba'].includes(league)) return res.status(400).json({ error: 'Invalid league' });
    if (!['pts', 'pra'].includes(stat)) return res.status(400).json({ error: 'Invalid stat' });
    if (!['over', 'under', 'both'].includes(direction)) return res.status(400).json({ error: 'Invalid direction' });
    if (typeof minDelta !== 'number' || minDelta <= 0) return res.status(400).json({ error: 'minDelta must be positive' });
    if (typeof minMinutes !== 'number' || minMinutes < 0) return res.status(400).json({ error: 'minMinutes must be >= 0' });

    const ruleData = {
      userId, league, stat, direction, minDelta, minMinutes,
      ...(playerId && { playerId }),
      ...(playerName && { playerName }),
      enabled: true,
      createdAt: new Date().toISOString(),
      lastTriggered: null,
    };

    const docRef = await addDoc(collection(db, 'alert_rules'), ruleData);

    return res.status(201).json({ id: docRef.id, success: true, message: 'Alert rule created' });
  } catch (error) {
    console.error('[alerts/rules/track] error:', error);
    return res.status(500).json({ error: 'Failed to create rule', detail: (error as Error).message });
  }
}
