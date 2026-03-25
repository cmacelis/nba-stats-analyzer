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
  return docs as FavoriteDoc[];
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
      const payload = verifyJwt(token);
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
    console.log('DEBUG: Path received:', path);
    
    if (path === 'send-saved-player-alerts') {
        if (req.method === 'POST') {
          console.log('=== SAVED PLAYER ALERTS TRIGGERED ===');
          console.log('User:', userEmail);
          
          // Fetch today's edges and eligible users
          const todayEdges = await fetchTodaysEdgeFeed();
          console.log('Today edges count:', todayEdges.length);
          
          const users = await getUsersWithSavedPlayerAlerts();
          console.log('Users with alerts enabled:', users);
          
          let totalNotificationsSent = 0;
          
          for (const email of users) {
            console.log('Processing user:', email);
            const favoriteIds = await getUserFavoritePlayerIds(email);
            console.log('Favorite player IDs:', favoriteIds);
            
            const matchingEdges = todayEdges.filter(edge => favoriteIds.includes(edge.player_id));
            console.log('Matching edges:', matchingEdges.length);
            
            const tokens = await getUserDeviceTokens(email);
            console.log('Device tokens:', tokens.length);
            
            for (const edge of matchingEdges) {
              const alreadySent = await hasNotificationBeenSentToday(email, edge.player_id);
              console.log(`Check for ${edge.player_name} (${edge.player_id}): already sent = ${alreadySent}`);
              
              if (!alreadySent) {
                // Prepare and send push notification
                const pushPayload = {
                  to: tokens,
                  title: 'Your saved player has a new edge',
                  body: `${edge.player_name} has a new Edge Detector signal today.`,
                  data: { type: 'saved_player_edge', playerId: edge.player_id, screen: 'PlayerDetail' }
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
                    await markNotificationSent(email, edge.player_id);
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
        const path = req.query._subpath as string | undefined;
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