/**
 * DELETE /api/alerts/rules/delete
 * Delete an alert rule by ID (with ownership verification).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../_lib.js';
import { getDocument, deleteDocument } from '../_firebase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'DELETE only' });

  try {
    const { ruleId, userId } = req.body;
    if (!ruleId || !userId) return res.status(400).json({ error: 'ruleId and userId are required' });

    const ruleDoc = await getDocument('alert_rules', ruleId);
    if (!ruleDoc) return res.status(404).json({ error: 'Rule not found' });
    if (ruleDoc.userId !== userId) return res.status(403).json({ error: 'Not authorized to delete this rule' });

    await deleteDocument('alert_rules', ruleId);

    return res.json({ success: true, message: 'Alert rule deleted' });
  } catch (error) {
    console.error('[alerts/rules/delete] error:', error);
    return res.status(500).json({ error: 'Failed to delete rule', detail: (error as Error).message });
  }
}
