/**
 * Pending alerts system for Discord bot integration.
 * Uses Firestore REST API (no firebase SDK).
 */

import { EdgeEntry } from '../../edge.js';
import { AlertRule } from './_checkRules.js';
import { addDocument } from '../_firebase.js';

/** Store a pending alert for Discord bot to process. */
export async function storePendingAlert(
  rule: AlertRule,
  entry: EdgeEntry,
  stat: 'pts' | 'pra'
): Promise<string> {
  const direction: 'over' | 'under' = entry.delta >= 0 ? 'over' : 'under';

  const docId = await addDocument('pending_alerts', {
    userId: rule.userId,
    ruleId: rule.id,
    playerName: entry.player_name,
    teamAbbrev: entry.team_abbrev,
    stat,
    delta: entry.delta,
    seasonAvg: entry.season_avg,
    recentAvg: entry.recent_avg,
    direction,
    minDelta: rule.minDelta,
    league: rule.league,
    createdAt: new Date().toISOString(),
    processed: false,
  });

  console.log(`[Pending Alerts] Stored alert ${docId} for user ${rule.userId}`);
  return docId;
}
