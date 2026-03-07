/**
 * Helper functions for checking alert rules against edge entries.
 */

import { EdgeEntry } from '../../edge.js';
import { db } from '../_firebase.js';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

export interface AlertRule {
  id: string;
  userId: string;
  league: 'nba' | 'wnba';
  playerId?: number;
  playerName?: string;
  stat: 'pts' | 'pra';
  direction: 'over' | 'under' | 'both';
  minDelta: number;
  minMinutes: number;
  enabled: boolean;
  createdAt: string;
  lastTriggered?: string;
}

export interface RuleMatch {
  rule: AlertRule;
  entry: EdgeEntry;
  matchedAt: Date;
}

/** Check if an edge entry matches an alert rule. */
export function matchesRule(entry: EdgeEntry, rule: AlertRule, stat: 'pts' | 'pra'): boolean {
  if (!rule.enabled) return false;
  if (rule.playerId && rule.playerId !== entry.player_id) return false;
  if (rule.stat !== stat) return false;

  if (rule.direction === 'over') return entry.delta >= rule.minDelta;
  if (rule.direction === 'under') return entry.delta <= -rule.minDelta;
  return Math.abs(entry.delta) >= rule.minDelta; // both
}

/** Get all active alert rules for a specific league. */
export async function getActiveRules(league: 'nba' | 'wnba'): Promise<AlertRule[]> {
  try {
    const rulesRef = collection(db, 'alert_rules');
    const q = query(rulesRef, where('league', '==', league), where('enabled', '==', true));
    const querySnapshot = await getDocs(q);
    const rules: AlertRule[] = [];

    querySnapshot.forEach(docSnap => {
      const data = docSnap.data();
      rules.push({
        id: docSnap.id,
        userId: data.userId,
        league: data.league,
        playerId: data.playerId || undefined,
        playerName: data.playerName || undefined,
        stat: data.stat,
        direction: data.direction,
        minDelta: data.minDelta,
        minMinutes: data.minMinutes,
        enabled: data.enabled !== false,
        createdAt: data.createdAt,
        lastTriggered: data.lastTriggered || undefined,
      });
    });

    return rules;
  } catch (error) {
    console.error('[_checkRules] Error fetching rules:', error);
    return [];
  }
}

/** Update rule's lastTriggered timestamp. */
export async function updateRuleLastTriggered(ruleId: string): Promise<void> {
  try {
    const ruleRef = doc(db, 'alert_rules', ruleId);
    await updateDoc(ruleRef, { lastTriggered: new Date().toISOString() });
  } catch (error) {
    console.error(`[_checkRules] Error updating rule ${ruleId}:`, error);
  }
}

/** Check edges against user rules and return matches. */
export async function checkRulesAgainstEdges(
  edges: EdgeEntry[],
  league: 'nba' | 'wnba',
  stat: 'pts' | 'pra',
  minMinutes: number
): Promise<RuleMatch[]> {
  const rules = await getActiveRules(league);
  const matches: RuleMatch[] = [];
  const filteredEdges = edges.filter(entry => entry.games_played >= minMinutes);

  for (const rule of rules) {
    for (const entry of filteredEdges) {
      if (matchesRule(entry, rule, stat)) {
        matches.push({ rule, entry, matchedAt: new Date() });
      }
    }
  }

  return matches;
}
