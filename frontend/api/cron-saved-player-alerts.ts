/**
 * cron-saved-player-alerts.ts
 * 
 * Automated cron job for saved player alerts
 * 
 * Vercel Cron: Runs daily after edge generation
 * URL: /api/cron-saved-player-alerts
 * 
 * Security: Requires CRON_SECRET environment variable
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';
import { getFreshnessStatus } from './_lib/freshness-check.js';
import { 
  fetchTodaysEdgeFeed, 
  getUsersWithSavedPlayerAlerts, 
  getUserFavoritePlayerIds, 
  getUserDeviceTokens,
  hasNotificationBeenSentToday,
  markNotificationSent,
  isUserVip,
  getEligibleFavoritePlayerIds,
  canReceiveAlertType
} from './alerts/_firebase.js';

// Helper to detect test/development device tokens
function isTestDeviceToken(token: string): boolean {
  if (!token) return false;
  
  const testPatterns = [
    /^ExpoPushToken\[TestDevice/i,
    /test_token/i,
    /fake_token/i,
    /^test$/i,
    /^fake$/i,
    /demo_token/i,
    /mock_token/i,
    /dummy_token/i
  ];
  
  return testPatterns.some(pattern => pattern.test(token));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  
  // Security: Require CRON_SECRET for automated calls
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = req.headers['x-cron-secret'] || req.query.secret;
  
  if (cronSecret && providedSecret !== cronSecret) {
    console.error('❌ Unauthorized cron attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  console.log('=== CRON: SAVED PLAYER ALERTS TRIGGERED ===');
  console.log('Time:', new Date().toISOString());
  
  try {
    // Check data freshness before proceeding
    const today = new Date().toISOString().slice(0, 10);
    let freshnessStatus: 'complete' | 'incomplete' | 'unknown' = 'unknown';
    
    try {
      freshnessStatus = await getFreshnessStatus(today);
      console.log(`[cron] Freshness check result: ${freshnessStatus}`);
    } catch (freshnessError) {
      console.warn(`[cron] Freshness check failed: ${freshnessError}`);
      // Fail-open: proceed with unknown status
    }
    
    // Gate based on freshness
    if (freshnessStatus === 'incomplete') {
      console.log(`[cron] Skipping alert generation - data incomplete (freshness: ${freshnessStatus})`);
      return res.json({
        success: true,
        skipped: true,
        reason: 'data_incomplete',
        freshness: freshnessStatus,
        timestamp: new Date().toISOString(),
        message: 'Skipped alert generation due to incomplete game data'
      });
    }
    
    console.log(`[cron] Proceeding with alert generation (freshness: ${freshnessStatus})`);
    
    // Fetch today's edges and eligible users
    const todayEdges = await fetchTodaysEdgeFeed();
    const users = await getUsersWithSavedPlayerAlerts();
    
    let totalNotificationsSent = 0;
    let testNotificationsSent = 0;
    let debugData = {
      users_count: users.length,
      users: users,
      today_edges_count: todayEdges.length,
      favorite_player_ids: [] as number[],
      matching_edges_count: 0,
      matching_edge_ids: [] as number[],
      tokens_count: 0,
      already_sent_count: 0,
      notifications_sent: 0,
      test_notifications_sent: 0,
      cron_execution_time: new Date().toISOString()
    };
    
    for (const email of users) {
      console.log(`Processing user: ${email}`);
      
      // Get user's favorite player IDs
      const allFavoritePlayerIds = await getUserFavoritePlayerIds(email);
      debugData.favorite_player_ids = [...debugData.favorite_player_ids, ...allFavoritePlayerIds];
      
      // Get eligible favorite player IDs (respecting free tier limits)
      const eligibleFavoritePlayerIds = await getEligibleFavoritePlayerIds(email, allFavoritePlayerIds);
      
      // Check if user can receive saved player alerts
      const canReceiveSavedPlayerAlerts = await canReceiveAlertType(email, 'saved_player_edge');
      if (!canReceiveSavedPlayerAlerts) {
        console.log(`  Skipping user ${email} - cannot receive saved player alerts`);
        continue;
      }
      
      // Match edges with ELIGIBLE favorites only
      const matchingEdges = todayEdges.filter(edge => 
        eligibleFavoritePlayerIds.includes(edge.player_id)
      );
      
      debugData.matching_edges_count += matchingEdges.length;
      debugData.matching_edge_ids = [...debugData.matching_edge_ids, ...matchingEdges.map(edge => edge.player_id)];
      
      const tokens = await getUserDeviceTokens(email);
      console.log(`Token analysis for ${email}: ${tokens.length} tokens`);
      
      // Analyze tokens
      const testTokens = tokens.filter(token => isTestDeviceToken(token));
      const realTokens = tokens.filter(token => !isTestDeviceToken(token));
      console.log(`  Real tokens: ${realTokens.length}, Test tokens: ${testTokens.length}`);
      
      // Check VIP status
      const isVip = await isUserVip(email);
      console.log(`  VIP status: ${isVip ? '✅ Premium' : '🆓 Free'}`);
      console.log(`  Eligible favorites: ${eligibleFavoritePlayerIds.length}/${allFavoritePlayerIds.length}`);
      
      debugData.tokens_count += tokens.length;
      
      for (const edge of matchingEdges) {
        const playerId = edge.player_id;
        const playerName = edge.player_name || `Player ${playerId}`;
        
        // Check if notification already sent today
        const alreadySent = await hasNotificationBeenSentToday(email, playerId);
        
        if (alreadySent) {
          debugData.already_sent_count++;
          console.log(`  Skipping ${playerName} - already sent today`);
          continue;
        }
        
        // Only proceed if user has tokens
        if (tokens.length === 0) {
          console.log(`  Skipping ${playerName} - no device tokens`);
          continue;
        }
        
        // Prepare and send push notification
        const pushPayload = {
          to: tokens,
          title: 'Your saved player has a new edge',
          body: `${playerName} has a new Edge Detector signal today.`,
          data: { type: 'saved_player_edge', playerId: playerId, screen: 'PlayerDetail' }
        };
        
        try {
          console.log(`  Sending push notification for: ${playerName}`);
          const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json', 
              'Authorization': `Bearer ${process.env.EXPO_ACCESS_TOKEN}` 
            },
            body: JSON.stringify(pushPayload)
          });
          const result = await expoResponse.json();
          
          if (result.data?.status === 'error') {
            console.error(`  Expo push error for ${playerName}:`, result.data.message);
            console.log(`  ❌ Failed send for: ${playerName}`);
          } else {
            // Check if any token is a test token
            const hasTestToken = tokens.some(token => isTestDeviceToken(token));
            
            if (hasTestToken) {
              // Test token - don't create dedupe record
              console.log(`  🧪 Test send for ${playerName} (test token detected, no dedupe)`);
              testNotificationsSent++;
              debugData.test_notifications_sent = testNotificationsSent;
            } else {
              // Real token - create dedupe record
              await markNotificationSent(email, playerId);
              totalNotificationsSent++;
              console.log(`  ✅ Real notification sent and logged for: ${playerName}`);
            }
          }
        } catch (error) {
          console.error(`  Push notification sending error for ${playerName}:`, error);
          console.log(`  ❌ Failed send for: ${playerName}`);
        }
      }
    }
    
    console.log('=== CRON EXECUTION COMPLETE ===');
    console.log(`Real notifications sent: ${totalNotificationsSent}`);
    console.log(`Test notifications sent: ${testNotificationsSent}`);
    console.log(`Total attempts: ${totalNotificationsSent + testNotificationsSent}`);
    
    return res.status(200).json({ 
      success: true, 
      message: `Cron executed. ${totalNotificationsSent} real + ${testNotificationsSent} test notifications sent.`,
      notifications_sent: totalNotificationsSent,
      test_notifications_sent: testNotificationsSent,
      ...debugData
    });
    
  } catch (error) {
    console.error('❌ Cron execution error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Cron execution failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}