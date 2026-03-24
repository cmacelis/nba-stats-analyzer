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
    { field: 'user_email', op: 'EQUAL', value: userEmail }
  ]);
  
  return docs.map(doc => ({
    id: doc.id as string,
    user_email: doc.user_email as string,
    player_id: doc.player_id as number,
    created_at: doc.created_at as string,
    source: doc.source as 'mobile' | 'web' | 'migration' | undefined,
  }));
}

// ── Helper: Add favorite ────────────────────────────────────────────────────

async function addFavorite(userEmail: string, playerId: number, source: FavoriteDoc['source'] = 'mobile'): Promise<FavoriteDoc> {
  const docId = generateFavoriteId(userEmail, playerId);
  const now = new Date().toISOString();
  
  const favoriteData = {
    user_email: userEmail,
    player_id: playerId,
    created_at: now,
    source,
  };
  
  await setDocument('favorites', docId, favoriteData);
  
  return {
    id: docId,
    ...favoriteData,
  };
}

// ── Helper: Remove favorite ─────────────────────────────────────────────────

async function removeFavorite(userEmail: string, playerId: number): Promise<boolean> {
  const docId = generateFavoriteId(userEmail, playerId);
  
  try {
    await deleteDocument('favorites', docId);
    return true;
  } catch (error) {
    console.error(`[favorites] Error removing favorite:`, error);
    return false;
  }
}

// ── Helper: Batch migrate favorites ─────────────────────────────────────────

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

// ── Helper: Resolve user email from Bearer token or session cookie ─────────

async function resolveUserEmail(req: VercelRequest): Promise<string | null> {
  // 1. Check for Bearer token in Authorization header (mobile auth)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = await verifyJwt(token);
    if (payload && payload.email) {
      return payload.email;
    }
  }
  
  // 2. Fall back to session cookie (web auth)
  return await getSessionEmail(req);
}

// ── Main handler ────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  try {
    // Authentication check - supports both Bearer token (mobile) and session cookie (web)
    const userEmail = await resolveUserEmail(req);
    if (!userEmail) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Verify user exists
    const user = await getUserByEmail(userEmail);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Route handling
    const path = req.query._subpath as string | undefined;
    
    // SIMPLE NOTIFICATION TEST - Add this first to see if it deploys
    if (path && path.startsWith('notifications/')) {
      const notificationPath = path.slice('notifications/'.length);
      
      // Simple test endpoint
      if (notificationPath === 'test' && req.method === 'GET') {
        return res.status(200).json({
          success: true,
          message: 'Notification test endpoint - SIMPLE VERSION',
          timestamp: new Date().toISOString(),
          deployed: true
        });
      }
      
      // Notification register endpoint
      if (notificationPath === 'register' && req.method === 'POST') {
        try {
          const { device_token, platform = 'ios' } = req.body;
          
          if (!device_token) {
            return res.status(400).json({ error: 'Missing device_token' });
          }
          
          // Simple response for now
          return res.status(200).json({
            success: true,
            message: 'Device token registered (simple)',
            device_token: device_token.substring(0, 10) + '...',
            platform,
            user_email: userEmail
          });
        } catch (error) {
          console.error('Notification register error:', error);
          return res.status(500).json({ error: 'Failed to register device token' });
        }
      }
      
      // Notification preferences endpoints
      if (notificationPath === 'preferences') {
        if (req.method === 'GET') {
          // Return default preferences
          return res.status(200).json({
            id: userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_'),
            user_email: userEmail,
            saved_player_alerts: true,
            daily_top_edge: true,
            game_day_alerts: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        } else if (req.method === 'POST') {
          // Update preferences
          const { saved_player_alerts, daily_top_edge, game_day_alerts } = req.body;
          return res.status(200).json({
            success: true,
            message: 'Preferences updated (simple)',
            preferences: {
              saved_player_alerts: saved_player_alerts !== undefined ? saved_player_alerts : true,
              daily_top_edge: daily_top_edge !== undefined ? daily_top_edge : true,
              game_day_alerts: game_day_alerts !== undefined ? game_day_alerts : false
            }
          });
        }
      }
    }
    
    // Regular favorites routing
    switch (req.method) {
      case 'GET':
        return await handleGetFavorites(req, res, userEmail);
      case 'POST':
        // Check if this is a migration request
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

// ── GET /api/favorites ──────────────────────────────────────────────────────

async function handleGetFavorites(req: VercelRequest, res: VercelResponse, userEmail: string) {
  try {
    const favorites = await getUserFavorites(userEmail);
    
    return res.json({
      success: true,
      favorites: favorites.map(f => ({
        player_id: f.player_id,
        created_at: f.created_at,
        source: f.source,
      })),
      count: favorites.length,
    });
  } catch (error) {
    console.error('[favorites] GET error:', error);
    return res.status(500).json({ error: 'Failed to fetch favorites' });
  }
}

// ── POST /api/favorites ─────────────────────────────────────────────────────

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
        created_at: favorite.created_at,
      },
      message: 'Favorite added successfully',
    });
  } catch (error) {
    console.error('[favorites] POST error:', error);
    return res.status(500).json({ error: 'Failed to add favorite' });
  }
}

// ── DELETE /api/favorites/:player_id ────────────────────────────────────────

async function handleRemoveFavorite(req: VercelRequest, res: VercelResponse, userEmail: string) {
  try {
    const playerId = parseInt(req.query.player_id as string, 10);
    
    if (isNaN(playerId)) {
      return res.status(400).json({ error: 'Valid player_id required' });
    }
    
    const success = await removeFavorite(userEmail, playerId);
    
    if (success) {
      return res.json({
        success: true,
        message: 'Favorite removed successfully',
      });
    } else {
      return res.status(404).json({ error: 'Favorite not found' });
    }
  } catch (error) {
    console.error('[favorites] DELETE error:', error);
    return res.status(500).json({ error: 'Failed to remove favorite' });
  }
}

// ── POST /api/favorites/migrate ─────────────────────────────────────────────

async function handleMigrateFavorites(req: VercelRequest, res: VercelResponse, userEmail: string) {
  try {
    const { player_ids } = req.body || {};
    
    if (!Array.isArray(player_ids) || player_ids.length === 0) {
      return res.status(400).json({ error: 'Valid player_ids array required' });
    }
    
    // Validate all player IDs are numbers
    const validPlayerIds = player_ids.filter(id => typeof id === 'number');
    if (validPlayerIds.length === 0) {
      return res.status(400).json({ error: 'No valid player IDs provided' });
    }
    
    const result = await migrateFavorites(userEmail, validPlayerIds);
    
    return res.json({
      success: true,
      migrated: result,
      message: `Migrated ${result.added} favorites (${result.skipped} already existed)`,
    });
  } catch (error) {
    console.error('[favorites] MIGRATE error:', error);
    return res.status(500).json({ error: 'Failed to migrate favorites' });
  }
}

