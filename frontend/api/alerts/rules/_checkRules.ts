/**
 * Helper functions for checking alert rules against edge entries.
 * Uses Firestore REST API (no firebase SDK).
 */

import { EdgeEntry } from '../../edge.js';
import { queryDocuments, updateDocument } from '../_firebase.js';

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
  return Math.abs(entry.delta) >= rule.minDelta;
}

/** Get all active alert rules for a specific league. */
export async function getActiveRules(league: 'nba' | 'wnba'): Promise<AlertRule[]> {
  try {
    const docs = await queryDocuments('alert_rules', [
      { field: 'league', op: 'EQUAL', value: league },
      { field: 'enabled', op: 'EQUAL', value: true },
    ]);

    return docs.map(d => ({
      id: d.id as string,
      userId: d.userId as string,
      league: d.league as 'nba' | 'wnba',
      playerId: (d.playerId as number) || undefined,
      playerName: (d.playerName as string) || undefined,
      stat: d.stat as 'pts' | 'pra',
      direction: d.direction as 'over' | 'under' | 'both',
      minDelta: d.minDelta as number,
      minMinutes: d.minMinutes as number,
      enabled: d.enabled !== false,
      createdAt: d.createdAt as string,
      lastTriggered: (d.lastTriggered as string) || undefined,
    }));
  } catch (error) {
    console.error('[_checkRules] Error fetching rules:', error);
    return [];
  }
}

/** Update rule's lastTriggered timestamp. */
export async function updateRuleLastTriggered(ruleId: string): Promise<void> {
  try {
    await updateDocument('alert_rules', ruleId, { lastTriggered: new Date().toISOString() });
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
