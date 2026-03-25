/**
 * favorites.ts — user favorites endpoint for mobile app
 * 
 * Phase 3: Add account-linked favorites persistence
 * 
 * Routes:
 *   GET    /api/favorites           → get user's favorites
 *   POST   /api/favorites           → add favorite (body: { player_id: number })
 *   DELETE /api/favorites/:player_id → remove favorite
 *   POST   /api/favorites/migrate   → migrate local favorites to account (body: { player_ids: number[] })
 * 
 * Authentication: Requires valid session cookie
 * Database: Firestore collection 'favorites'
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';
import { getSessionEmail, getUserByEmail, verifyJwt } from './_auth.js';
import { queryDocuments, setDocument, deleteDocument, addDocument, getDocument } from './alerts/_firebase.js';
import { 
  fetchTodaysEdgeFeed, 
  getUsersWithSavedPlayerAlerts, 
  getUserFavoritePlayerIds, 
  getUserDeviceTokens,
  hasNotificationBeenSentToday,
  markNotificationSent
} from './alerts/_firebase.js';

// ── Types ───────────────────────────────────────────────────────────────────

interface FavoriteDoc {
  id: string;           // Firestore document ID (user_email + player_id)
  user_email: string;   // User's email (from session)
  player_id: number;    // NBA player ID
  created_at: string;   // ISO timestamp
  source?: 'mobile' | 'web' | 'migration'; // How this favorite was added
}

// ── Helper: Generate document ID ────────────────────────────────────────────

function generateFavoriteId(userEmail: string, playerId: number): string {
  // Create deterministic ID: user_email + player_id
  const safeEmail = userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `${safeEmail}_${playerId}`;
}

// ── Helper: Get user's favorites ────────────────────────────────────────────

async function getUserFavorites(userEmail: string): Promise<FavoriteDoc[]> {
  const docs = await queryDocuments('favorites', [
    { field: 'user_email', op: '==', value: userEmail }
  ]);
  // Cast each document to FavoriteDoc
  return docs.map(doc => ({
    id: doc.id as string,
    user_email: doc.user_email as string,
    player_id: doc.player_id as number,
    created_at: doc.created_at as string,
    source: doc.source as 'mobile' | 'web' | 'migration'
  }));
}

// ── Helper: Add favorite ────────────────────────────────────────────────────

async function addFavorite(userEmail: string, playerId: number, source: 'mobile' | 'web' | 'migration' = 'mobile'): Promise<FavoriteDoc> {
  const id = generateFavoriteId(userEmail, playerId);
  const favorite: FavoriteDoc = {
    id,
    user_email: userEmail,
    player_id: playerId,
    created_at: new Date().toISOString(),
    source
  };
  
  await setDocument('favorites', id, favorite);
  return favorite;
}

// ── Helper: Remove favorite ─────────────────────────────────────────────────

async function removeFavorite(userEmail: string, playerId: number): Promise<void> {
  const id = generateFavoriteId(userEmail, playerId);
  await deleteDocument('favorites', id);
}

// ── Helper: Resolve user email from request ─────────────────────────────────

async function resolveUserEmail(req: VercelRequest): Promise<string | null> {
  // Try Bearer token first (mobile app)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = await verifyJwt(token);
      return payload.email || null;
    } catch {
      // Token invalid, fall through to session
    }
  }
  
  // Fall back to session cookie (web)
  return getSessionEmail(req);
}

// ── Handler: GET /api/favorites ─────────────────────────────────────────────

async function handleGetFavorites(req: VercelRequest, res: VercelResponse, userEmail: string) {
  const favorites = await getUserFavorites(userEmail);
  return res.json({
    success: true,
    favorites: favorites.map(f => ({
      player_id: f.player_id,
      created_at: f.created_at,
      source: f.source
    })),
    count: favorites.length
  });
}

// ── Handler: POST /api/favorites ────────────────────────────────────────────

async function handleAddFavorite(req: VercelRequest, res: VercelResponse, userEmail: string) {
  try {
    const { player_id } = req.body || {};
    
    if (!player_id || typeof player_id !== 'number') {
      return res.status(400).json({ error: 'Valid player_id required' });
    }
    
    const favorite = await addFavorite(userEmail, player_id, 'mobile');
    
    return res.json({
      success: true,
      favorite: {
        player_id: favorite.player_id,
        created_at: favorite.created_at
      },
      message: 'Favorite added successfully'
    });
  } catch (error) {
    console.error('[favorites] Add error:', error);
    return res.status(500).json({ error: 'Failed to add favorite' });
  }
}

// ── Handler: DELETE /api/favorites/:player_id ───────────────────────────────

async function handleRemoveFavorite(req: VercelRequest, res: VercelResponse, userEmail: string) {
  try {
    const { player_id } = req.query;
    const playerId = parseInt(player_id as string, 10);
    
    if (isNaN(playerId)) {
      return res.status(400).json({ error: 'Valid player_id required' });
    }
    
    await removeFavorite(userEmail, playerId);
    
    return res.json({
      success: true,
      message: 'Favorite removed successfully'
    });
  } catch (error) {
    console.error('[favorites] Remove error:', error);
    return res.status(500).json({ error: 'Failed to remove favorite' });
  }
}

// ── Handler: POST /api/favorites/migrate ────────────────────────────────────

async function migrateFavorites(userEmail: string, playerIds: number[]): Promise<{ added: number; skipped: number }> {
  let added = 0;
  let skipped = 0;
  
  // Get existing favorites to avoid duplicates
  const existingFavorites = await getUserFavorites(userEmail);
  const existingPlayerIds = new Set(existingFavorites.map(f => f.player_id));
  
  // Add new favorites
  for (const playerId of playerIds) {
    if (existingPlayerIds.has(playerId)) {
      skipped++;
      continue;
    }
    
    await addFavorite(userEmail, playerId, 'migration');
    added++;
  }
  
  return { added, skipped };
}

async function handleMigrateFavorites(req: VercelRequest, res: VercelResponse, userEmail: string) {
  try {
    const { player_ids } = req.body || {};
    
    if (!Array.isArray(player_ids) || player_ids.length === 0) {
      return res.status(400).json({ error: 'player_ids array required' });
    }
    
    const { added, skipped } = await migrateFavorites(userEmail, player_ids);
    
    return res.json({
      success: true,
      added,
      skipped,
      message: `Migration complete: ${added} added, ${skipped} skipped (already favorites)`
    });
  } catch (error) {
    console.error('[favorites] Migration error:', error);
    return res.status(500).json({ error: 'Migration failed' });
  }
}

// ── Main handler ────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set up CORS
  if (applyCors(req, res)) return;
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  try {
    // Authentication check
    const userEmail = await resolveUserEmail(req);
    if (!userEmail) return res.status(401).json({ error: 'Authentication required' });

    // Verify user exists
    const user = await getUserByEmail(userEmail);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Route handling
    const path = req.query._subpath as string | undefined;

    // First handle notification requests
    if (path && path.startsWith('notifications/')) {
      const notificationPath = path.slice('notifications/'.length);

      // ── Register device token ──────────────────────────────────────
      if (notificationPath === 'register' && req.method === 'POST') {
        const { device_token, platform = 'ios' } = req.body || {};
        if (!device_token) {
          return res.status(400).json({ error: 'Missing device_token' });
        }
        if (!['ios', 'android'].includes(platform)) {
          return res.status(400).json({ error: 'Invalid platform' });
        }
        const safeEmail = userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const tokenHash = Buffer.from(device_token).toString('base64').slice(0, 20).replace(/[^a-zA-Z0-9]/g, '');
        const docId = `${safeEmail}_${tokenHash}`;
        const now = new Date().toISOString();
        await setDocument('device_tokens', docId, {
          id: docId,
          user_email: userEmail,
          device_token,
          platform,
          created_at: now,
          updated_at: now,
        });
        return res.status(200).json({ success: true, message: 'Device token registered', docId });
      }

      // ── Notification preferences ───────────────────────────────────
      if (notificationPath === 'preferences') {
        const safeEmail = userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');

        if (req.method === 'GET') {
          const existing = await getDocument('alert_preferences', safeEmail);
          if (existing) {
            return res.status(200).json({
              id: existing.id,
              user_email: existing.user_email,
              saved_player_alerts: existing.saved_player_alerts,
              daily_top_edge: existing.daily_top_edge,
              game_day_alerts: existing.game_day_alerts,
              created_at: existing.created_at,
              updated_at: existing.updated_at,
            });
          }
          // Return defaults
          const now = new Date().toISOString();
          return res.status(200).json({
            id: safeEmail,
            user_email: userEmail,
            saved_player_alerts: true,
            daily_top_edge: true,
            game_day_alerts: false,
            created_at: now,
            updated_at: now,
          });
        }

        if (req.method === 'POST') {
          const { saved_player_alerts, daily_top_edge, game_day_alerts } = req.body || {};
          const existing = await getDocument('alert_preferences', safeEmail);
          const now = new Date().toISOString();
          const prefsDoc = {
            id: safeEmail,
            user_email: userEmail,
            saved_player_alerts: saved_player_alerts !== undefined ? saved_player_alerts : true,
            daily_top_edge: daily_top_edge !== undefined ? daily_top_edge : true,
            game_day_alerts: game_day_alerts !== undefined ? game_day_alerts : false,
            created_at: (existing?.created_at as string) || now,
            updated_at: now,
          };
          await setDocument('alert_preferences', safeEmail, prefsDoc);
          return res.status(200).json({ success: true, message: 'Preferences updated', preferences: prefsDoc });
        }

        return res.status(405).json({ error: 'Method not allowed' });
      }

      if (notificationPath === 'send-saved-player-alerts') {
        if (req.method === 'POST') {
          console.log('=== SAVED PLAYER ALERTS TRIGGERED ===');
          console.log('User:', userEmail);
          
          // Fetch today's edges and eligible users
          const todayEdges = await fetchTodaysEdgeFeed();
          console.log('EDGE FEED RAW (first 3):', todayEdges.slice(0, 3));
          console.log('Today edges count:', todayEdges.length);
          
          const users = await getUsersWithSavedPlayerAlerts();
          console.log('Users with alerts enabled:', users);
          
          let totalNotificationsSent = 0;
          
          for (const email of users) {
            console.log('Processing user:', email);
            const favorites = await getUserFavorites(email);
            console.log('FAVORITES RAW:', favorites);
            
            // Extract player IDs from favorites
            const favoritePlayerIds = favorites.map(f => f.player_id).filter(id => id > 0);
            
            console.log('Normalized favorite player IDs:', favoritePlayerIds);
            
            // Match edges with favorites
            const matchingEdges = todayEdges.filter(edge => {
              const edgePlayerId = edge.player_id || 0;
              return favoritePlayerIds.includes(edgePlayerId);
            });
            
            console.log('Matching edges:', matchingEdges.length);
            
            const tokens = await getUserDeviceTokens(email);
            console.log('Device tokens:', tokens.length);
            
            for (const edge of matchingEdges) {
              const playerId = edge.player_id || 0;
              const playerName = edge.player_name || 'Unknown Player';
              
              if (!playerId || playerId === 0) {
                console.error('INVALID PLAYER ID IN EDGE:', edge);
                continue; // Skip this edge
              }
              
              const alreadySent = await hasNotificationBeenSentToday(email, playerId);
              console.log(`Check for ${playerName} (${playerId}): already sent = ${alreadySent}`);
              
              if (!alreadySent) {
                // Prepare and send push notification
                const pushPayload = {
                  to: tokens,
                  title: 'Your saved player has a new edge',
                  body: `${playerName} has a new Edge Detector signal today.`,
                  data: { type: 'saved_player_edge', playerId: playerId, screen: 'PlayerDetail' }
                };

                try {
                  console.log('Sending push notification for:', edge.player_name);
                  const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.EXPO_ACCESS_TOKEN}` },
                    body: JSON.stringify(pushPayload)
                  });
                  const result = await expoResponse.json();

                  if (result.data?.status === 'error') {
                    console.error('Expo push error:', result.data.message);
                  } else {
                    await markNotificationSent(email, playerId);
                    totalNotificationsSent++;
                    console.log('Notification sent and logged for:', edge.player_name);
                  }
                } catch (error) {
                  console.error('Push notification sending error:', error);
                }
              }
            }
          }
          
          console.log('=== ALERTS COMPLETE ===');
          console.log('Total notifications sent:', totalNotificationsSent);
          
          return res.status(200).json({ 
            success: true, 
            message: `Alerts sent successfully. ${totalNotificationsSent} notifications delivered.`,
            notifications_sent: totalNotificationsSent
          });
        }
        return res.status(405).json({ error: 'Method not allowed' });
      }
    }

    // Proceed with existing favorite routes
    switch (req.method) {
      case 'GET':
        return await handleGetFavorites(req, res, userEmail);
      case 'POST':
        // Check if it's a migration request
        if (path === 'migrate') {
          return await handleMigrateFavorites(req, res, userEmail);
        }
        return await handleAddFavorite(req, res, userEmail);
      case 'DELETE':
        return await handleRemoveFavorite(req, res, userEmail);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[favorites] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}