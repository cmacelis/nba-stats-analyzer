/**
 * Pending alerts system for Discord bot integration.
 * 
 * When alerts/run finds user rule matches, it stores them here.
 * The Discord bot polls this collection and sends DMs.
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc,
  Timestamp 
} from 'firebase/firestore';
import { EdgeEntry } from '../edge.js';
import { AlertRule } from './_checkRules.js';

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
  processedAt?: Date;
  error?: string;
}

/**
 * Store a pending alert for Discord bot to process.
 */
export async function storePendingAlert(
  rule: AlertRule,
  entry: EdgeEntry,
  stat: 'pts' | 'pra'
): Promise<string> {
  try {
    const direction: 'over' | 'under' = entry.delta >= 0 ? 'over' : 'under';
    
    const alertData: Omit<PendingAlert, 'id'> = {
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
  } catch (error) {
    console.error('[Pending Alerts] Error storing alert:', error);
    throw error;
  }
}

/**
 * Get unprocessed pending alerts.
 */
export async function getUnprocessedAlerts(limit = 50): Promise<PendingAlert[]> {
  try {
    const alertsRef = collection(db, 'pending_alerts');
    const q = query(
      alertsRef,
      where('processed', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    const alerts: PendingAlert[] = [];

    querySnapshot.forEach(docSnap => {
      const data = docSnap.data();
      alerts.push({
        id: docSnap.id,
        userId: data.userId,
        ruleId: data.ruleId,
        playerName: data.playerName,
        teamAbbrev: data.teamAbbrev,
        stat: data.stat,
        delta: data.delta,
        seasonAvg: data.seasonAvg,
        recentAvg: data.recentAvg,
        direction: data.direction,
        minDelta: data.minDelta,
        league: data.league,
        createdAt: data.createdAt.toDate(),
        processed: data.processed,
        processedAt: data.processedAt?.toDate(),
        error: data.error,
      });
    });

    // Sort by creation date (oldest first)
    alerts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    
    // Limit results
    return alerts.slice(0, limit);
  } catch (error) {
    console.error('[Pending Alerts] Error fetching alerts:', error);
    return [];
  }
}

/**
 * Mark an alert as processed (successfully sent).
 */
export async function markAlertProcessed(alertId: string): Promise<void> {
  try {
    const alertRef = doc(db, 'pending_alerts', alertId);
    await deleteDoc(alertRef); // Remove instead of update to keep collection clean
    console.log(`[Pending Alerts] Removed processed alert ${alertId}`);
  } catch (error) {
    console.error(`[Pending Alerts] Error marking alert ${alertId} as processed:`, error);
  }
}

/**
 * Mark an alert as failed.
 */
export async function markAlertFailed(alertId: string, errorMessage: string): Promise<void> {
  try {
    const alertRef = doc(db, 'pending_alerts', alertId);
    await deleteDoc(alertRef); // Remove failed alerts too
    console.log(`[Pending Alerts] Removed failed alert ${alertId}: ${errorMessage}`);
  } catch (error) {
    console.error(`[Pending Alerts] Error marking alert ${alertId} as failed:`, error);
  }
}

/**
 * Clean up old processed alerts (older than 24 hours).
 */
export async function cleanupOldAlerts(): Promise<number> {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const alertsRef = collection(db, 'pending_alerts');
    const q = query(
      alertsRef,
      where('createdAt', '<', Timestamp.fromDate(twentyFourHoursAgo))
    );
    
    const querySnapshot = await getDocs(q);
    const deletePromises: Promise<void>[] = [];
    
    querySnapshot.forEach(docSnap => {
      deletePromises.push(deleteDoc(doc(db, 'pending_alerts', docSnap.id)));
    });
    
    await Promise.all(deletePromises);
    console.log(`[Pending Alerts] Cleaned up ${deletePromises.length} old alerts`);
    return deletePromises.length;
  } catch (error) {
    console.error('[Pending Alerts] Error cleaning up old alerts:', error);
    return 0;
  }
}