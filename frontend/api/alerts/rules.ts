/**
 * /api/alerts/rules — Combined endpoint for alert rule CRUD.
 *
 *   GET    ?userId=...           → list rules
 *   POST   { userId, league, stat, direction, minDelta, minMinutes }  → create rule
 *   DELETE { ruleId, userId }    → delete rule
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib.js';
import { addDocument, getDocument, deleteDocument, queryDocuments } from './_firebase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  // ── GET: list rules ────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: 'userId query parameter is required' });

      const docs = await queryDocuments('alert_rules', [
        { field: 'userId', op: 'EQUAL', value: userId },
      ]);

      const rules = docs.map(d => ({
        id: d.id, userId: d.userId, league: d.league,
        playerId: d.playerId || null, playerName: d.playerName || null,
        stat: d.stat, direction: d.direction,
        minDelta: d.minDelta, minMinutes: d.minMinutes,
        enabled: d.enabled !== false,
        createdAt: d.createdAt, lastTriggered: d.lastTriggered || null,
      }));

      rules.sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());

      return res.json({ success: true, count: rules.length, rules });
    } catch (error) {
      console.error('[alerts/rules GET] error:', error);
      return res.status(500).json({ error: 'Failed to list rules', detail: (error as Error).message });
    }
  }

  // ── POST: create rule ──────────────────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const { userId, league, playerId, playerName, stat, direction, minDelta, minMinutes } = req.body;

      if (!userId || !league || !stat || !direction)
        return res.status(400).json({ error: 'Missing required fields: userId, league, stat, direction' });
      if (!['nba', 'wnba'].includes(league)) return res.status(400).json({ error: 'Invalid league' });
      if (!['pts', 'pra'].includes(stat)) return res.status(400).json({ error: 'Invalid stat' });
      if (!['over', 'under', 'both'].includes(direction)) return res.status(400).json({ error: 'Invalid direction' });
      if (typeof minDelta !== 'number' || minDelta <= 0) return res.status(400).json({ error: 'minDelta must be positive' });
      if (typeof minMinutes !== 'number' || minMinutes < 0) return res.status(400).json({ error: 'minMinutes must be >= 0' });

      const ruleData: Record<string, unknown> = {
        userId, league, stat, direction, minDelta, minMinutes,
        enabled: true, createdAt: new Date().toISOString(), lastTriggered: null,
      };
      if (playerId) ruleData.playerId = playerId;
      if (playerName) ruleData.playerName = playerName;

      const docId = await addDocument('alert_rules', ruleData);
      return res.status(201).json({ id: docId, success: true, message: 'Alert rule created' });
    } catch (error) {
      console.error('[alerts/rules POST] error:', error);
      return res.status(500).json({ error: 'Failed to create rule', detail: (error as Error).message });
    }
  }

  // ── DELETE: remove rule ────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    try {
      const { ruleId, userId } = req.body;
      if (!ruleId || !userId) return res.status(400).json({ error: 'ruleId and userId are required' });

      const ruleDoc = await getDocument('alert_rules', ruleId);
      if (!ruleDoc) return res.status(404).json({ error: 'Rule not found' });
      if (ruleDoc.userId !== userId) return res.status(403).json({ error: 'Not authorized to delete this rule' });

      await deleteDocument('alert_rules', ruleId);
      return res.json({ success: true, message: 'Alert rule deleted' });
    } catch (error) {
      console.error('[alerts/rules DELETE] error:', error);
      return res.status(500).json({ error: 'Failed to delete rule', detail: (error as Error).message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed. Use GET, POST, or DELETE.' });
}
