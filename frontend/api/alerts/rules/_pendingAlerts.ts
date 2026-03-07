/**
 * Pending alerts system for Discord bot integration.
 * Stores alerts in Firestore for the Discord bot to poll and send DMs.
 */

import { db } from '../_firebase.js';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { EdgeEntry } from '../../edge.js';
import { AlertRule } from './_checkRules.js';

export interface PendingAlert {
  id?: string;
  userId: string;
  ruleId: string;
  playerName: string;
  teamAbbrev: string;
  stat: 'pts' | 'pra';
  delta: number;
  seasonAvg: number;
  recentAvg: number;
  direction: 'over' | 'under';
  minDelta: number;
  league: 'nba' | 'wnba';
  createdAt: Date;
  processed: boolean;
}

/** Store a pending alert for Discord bot to process. */
export async function storePendingAlert(
  rule: AlertRule,
  entry: EdgeEntry,
  stat: 'pts' | 'pra'
): Promise<string> {
  const direction: 'over' | 'under' = entry.delta >= 0 ? 'over' : 'under';

  const alertData = {
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
    createdAt: new Date(),
    processed: false,
  };

  const docRef = await addDoc(collection(db, 'pending_alerts'), alertData);
  console.log(`[Pending Alerts] Stored alert ${docRef.id} for user ${rule.userId}`);
  return docRef.id;
}
