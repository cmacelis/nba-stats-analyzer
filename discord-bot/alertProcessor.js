/**
 * Alert Processor for Discord Bot
 * 
 * Polls Firestore for pending alerts and sends DMs to users.
 * This runs as a background task in the bot.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

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

/**
 * Get unprocessed pending alerts from Firestore.
 */
async function getUnprocessedAlerts(limit = 10) {
  try {
    const alertsRef = collection(db, 'pending_alerts');
    const q = query(alertsRef, where('processed', '==', false));
    
    const querySnapshot = await getDocs(q);
    const alerts = [];

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
        createdAt: data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt,
      });
    });

    // Sort by creation date (oldest first)
    alerts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    
    return alerts.slice(0, limit);
  } catch (error) {
    console.error('[Alert Processor] Error fetching alerts:', error);
    return [];
  }
}

/**
 * Remove processed alert from Firestore.
 */
async function removeAlert(alertId) {
  try {
    const alertRef = doc(db, 'pending_alerts', alertId);
    await deleteDoc(alertRef);
  } catch (error) {
    console.error(`[Alert Processor] Error removing alert ${alertId}:`, error);
  }
}

/**
 * Send personalized alert to user via DM.
 */
async function sendAlertToUser(client, alert) {
  try {
    const user = await client.users.fetch(alert.userId);
    if (!user) {
      console.warn(`[Alert Processor] User ${alert.userId} not found`);
      return false;
    }

    const sign = alert.delta >= 0 ? '+' : '';
    const emoji = alert.delta >= 0 ? '🔥' : '🧊';
    const direction = alert.delta >= 0 ? 'Over' : 'Under';
    const color = alert.delta >= 0 ? 0x22c55e : 0x3b82f6;

    const embed = {
      title: `${emoji} ${alert.playerName} (${alert.teamAbbrev}) — ${alert.stat.toUpperCase()} ${direction} Edge`,
      color,
      description: `**${sign}${alert.delta.toFixed(1)}** vs season average (L5 trending ${alert.delta >= 0 ? 'hot' : 'cold'})`,
      fields: [
        { name: 'Season Avg', value: alert.seasonAvg.toFixed(1), inline: true },
        { name: 'L5 Avg', value: alert.recentAvg.toFixed(1), inline: true },
        { name: 'Δ', value: `${sign}${alert.delta.toFixed(1)}`, inline: true },
        { name: 'Your Rule', value: `${alert.direction} ${alert.stat.toUpperCase()} ≥ ${alert.minDelta}`, inline: true },
        { name: 'League', value: alert.league.toUpperCase(), inline: true },
        { name: 'Rule ID', value: alert.ruleId, inline: true },
      ],
      footer: { text: 'Edge Detector Personal Alert' },
      timestamp: new Date().toISOString(),
    };

    await user.send({
      content: `🔔 **Personal Alert Triggered!**`,
      embeds: [embed],
    });

    console.log(`[Alert Processor] Sent alert to ${user.tag} (${alert.userId})`);
    return true;
  } catch (error) {
    if (error.code === 50007) {
      console.log(`[Alert Processor] User ${alert.userId} has DMs disabled`);
    } else {
      console.error(`[Alert Processor] Failed to send alert to ${alert.userId}:`, error.message);
    }
    return false;
  }
}

/**
 * Main alert processing loop.
 */
export async function startAlertProcessor(client) {
  console.log('[Alert Processor] Started');

  // Poll for alerts every 30 seconds
  setInterval(async () => {
    try {
      const alerts = await getUnprocessedAlerts(10);

      if (alerts.length === 0) return;

      console.log(`[Alert Processor] Processing ${alerts.length} pending alerts`);

      for (const alert of alerts) {
        const success = await sendAlertToUser(client, alert);
        
        // Always remove the alert after attempting to send (success or failure)
        await removeAlert(alert.id);
        
        if (success) {
          console.log(`[Alert Processor] ✓ Alert ${alert.id} processed`);
        } else {
          console.log(`[Alert Processor] ✗ Alert ${alert.id} failed (removed)`);
        }

        // Rate limiting: wait 1 second between DMs to avoid Discord spam
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('[Alert Processor] Error in main loop:', error);
    }
  }, 30000); // 30 second interval
}

export default { startAlertProcessor };