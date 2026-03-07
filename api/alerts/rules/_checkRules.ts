/**
 * Helper functions for checking alert rules against edge entries.
 */

import { EdgeEntry } from '../edge.js';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

/**
 * Check if an edge entry matches an alert rule.
 */
export function matchesRule(entry: EdgeEntry, rule: AlertRule, stat: 'pts' | 'pra'): boolean {
  // Check if rule is enabled
  if (!rule.enabled) return false;

  // Check league (we'll need to pass league context from caller)
  // This will be handled by the caller filtering rules by league

  // Check player match (if specified)
  if (rule.playerId && rule.playerId !== entry.player_id) {
    return false;
  }

  // Check stat match
  if (rule.stat !== stat) {
    return false;
  }

  // Check min minutes (entry should already be filtered by minMinutes)
  // We'll trust the entry meets the minMinutes requirement

  // Check direction and delta threshold
  const matchesDirection = (() => {
    if (rule.direction === 'over') return entry.delta >= rule.minDelta;
    if (rule.direction === 'under') return entry.delta <= -rule.minDelta;
    return Math.abs(entry.delta) >= rule.minDelta; // both
  })();

  return matchesDirection;
}

/**
 * Get all active alert rules for a specific league.
 */
export async function getActiveRules(league: 'nba' | 'wnba'): Promise<AlertRule[]> {
  try {
    const rulesRef = collection(db, 'alert_rules');
    const q = query(
      rulesRef,
      where('league', '==', league),
      where('enabled', '==', true)
    );
    
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
    console.error('[alerts/rules/_checkRules] Error fetching rules:', error);
    return [];
  }
}

/**
 * Update rule's lastTriggered timestamp.
 */
export async function updateRuleLastTriggered(ruleId: string): Promise<void> {
  try {
    const ruleRef = doc(db, 'alert_rules', ruleId);
    await updateDoc(ruleRef, {
      lastTriggered: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[alerts/rules/_checkRules] Error updating rule ${ruleId}:`, error);
  }
}

/**
 * Check edges against user rules and return matches.
 */
export async function checkRulesAgainstEdges(
  edges: EdgeEntry[],
  league: 'nba' | 'wnba',
  stat: 'pts' | 'pra',
  minMinutes: number
): Promise<RuleMatch[]> {
  const rules = await getActiveRules(league);
  const matches: RuleMatch[] = [];

  // Filter edges by minMinutes (just in case)
  const filteredEdges = edges.filter(entry => entry.games_played >= minMinutes);

  for (const rule of rules) {
    for (const entry of filteredEdges) {
      if (matchesRule(entry, rule, stat)) {
        matches.push({
          rule,
          entry,
          matchedAt: new Date(),
        });
      }
    }
  }

  return matches;
}