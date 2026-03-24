/**
 * notifications/index.ts — notification endpoints for mobile app
 * 
 * Phase 5: Notification foundation implementation
 * 
 * Routes:
 *   POST   /api/notifications/register    → register/update device token
 *   GET    /api/notifications/preferences → get user's notification preferences
 *   POST   /api/notifications/preferences → update notification preferences
 * 
 * Authentication: Requires valid session cookie
 * Database: Firestore collections 'device_tokens' and 'alert_preferences'
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib.js';
import { getSessionEmail, verifyJwt } from '../_auth.js';
import { queryDocuments, setDocument, deleteDocument, addDocument, getDocument } from '../alerts/_firebase.js';

// ── Types ───────────────────────────────────────────────────────────────────

interface DeviceTokenDoc {
  id: string;           // Firestore document ID (user_email + device_token hash)
  user_email: string;   // User's email (from session)
  device_token: string; // Expo push token (e.g., "ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]")
  platform: 'ios' | 'android';
  created_at: string;   // ISO timestamp
  updated_at: string;   // ISO timestamp
}

interface AlertPreferencesDoc {
  id: string;           // Firestore document ID (user_email)
  user_email: string;   // User's email (from session)
  saved_player_alerts: boolean;  // Notifications when saved players get edges
  daily_top_edge: boolean;       // Daily top edge notification
  game_day_alerts: boolean;      // Game day reminders
  created_at: string;   // ISO timestamp
  updated_at: string;   // ISO timestamp
}

// ── Helper: Generate document IDs ───────────────────────────────────────────

function generateDeviceTokenId(userEmail: string, deviceToken: string): string {
  // Create deterministic ID: user_email + token hash
  const safeEmail = userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
  // Simple hash of device token (first 20 chars of base64 encoded SHA-256)
  const tokenHash = Buffer.from(deviceToken).toString('base64').slice(0, 20).replace(/[^a-zA-Z0-9]/g, '');
  return `${safeEmail}_${tokenHash}`;
}

function generatePreferencesId(userEmail: string): string {
  // One preferences document per user
  const safeEmail = userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `${safeEmail}_prefs`;
}

// ── Helper: Validate device token format ───────────────────────────────────

function isValidDeviceToken(token: string): boolean {
  // Expo push tokens start with "ExpoPushToken[" and end with "]"
  return token.startsWith('ExpoPushToken[') && token.endsWith(']') && token.length > 20;
}

// ── Helper: Get user's device tokens ───────────────────────────────────────

async function getUserDeviceTokens(userEmail: string): Promise<DeviceTokenDoc[]> {
  const docs = await queryDocuments('device_tokens', [
    { field: 'user_email', op: 'EQUAL', value: userEmail }
  ]);
  
  return docs.map(doc => ({
    id: doc.id as string,
    user_email: doc.user_email as string,
    device_token: doc.device_token as string,
    platform: doc.platform as 'ios' | 'android',
    created_at: doc.created_at as string,
    updated_at: doc.updated_at as string,
  }));
}

// ── Helper: Get user's alert preferences ───────────────────────────────────

async function getUserAlertPreferences(userEmail: string): Promise<AlertPreferencesDoc | null> {
  const docId = generatePreferencesId(userEmail);
  const doc = await getDocument('alert_preferences', docId);
  
  if (!doc) return null;
  
  return {
    id: doc.id as string,
    user_email: doc.user_email as string,
    saved_player_alerts: doc.saved_player_alerts as boolean,
    daily_top_edge: doc.daily_top_edge as boolean,
    game_day_alerts: doc.game_day_alerts as boolean,
    created_at: doc.created_at as string,
    updated_at: doc.updated_at as string,
  };
}

// ── Helper: Create default preferences ─────────────────────────────────────

async function createDefaultPreferences(userEmail: string): Promise<AlertPreferencesDoc> {
  const docId = generatePreferencesId(userEmail);
  const now = new Date().toISOString();
  
  const defaultPrefs: Omit<AlertPreferencesDoc, 'id'> = {
    user_email: userEmail,
    saved_player_alerts: true,  // Default: ON (most valuable feature)
    daily_top_edge: false,      // Default: OFF
    game_day_alerts: false,     // Default: OFF
    created_at: now,
    updated_at: now,
  };
  
  await setDocument('alert_preferences', docId, defaultPrefs);
  
  return {
    id: docId,
    ...defaultPrefs
  };
}

// ── POST /api/notifications/register ───────────────────────────────────────

async function handleRegister(req: VercelRequest, res: VercelResponse) {
  try {
    const { device_token, platform } = req.body;
    
    // Validate input
    if (!device_token || !platform) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Both device_token and platform are required'
      });
    }
    
    if (!isValidDeviceToken(device_token)) {
      return res.status(400).json({
        error: 'Invalid device token format',
        details: 'Token must start with "ExpoPushToken[" and end with "]"'
      });
    }
    
    if (platform !== 'ios' && platform !== 'android') {
      return res.status(400).json({
        error: 'Invalid platform',
        details: 'Platform must be "ios" or "android"'
      });
    }
    
    // Get user email from session
    const userEmail = await getSessionEmail(req);
    if (!userEmail) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if user already has 5 devices (prevent abuse)
    const existingTokens = await getUserDeviceTokens(userEmail);
    if (existingTokens.length >= 5) {
      // Remove oldest token if user has 5 already
      const oldestToken = existingTokens.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )[0];
      
      await deleteDocument('device_tokens', oldestToken.id);
    }
    
    // Create or update device token
    const docId = generateDeviceTokenId(userEmail, device_token);
    const now = new Date().toISOString();
    
    const tokenDoc: Omit<DeviceTokenDoc, 'id'> = {
      user_email: userEmail,
      device_token,
      platform,
      created_at: now,
      updated_at: now,
    };
    
    await setDocument('device_tokens', docId, tokenDoc);
    
    return res.status(200).json({
      success: true,
      message: 'Device token registered',
      token_id: docId,
      platform,
      registered_at: now
    });
    
  } catch (error) {
    console.error('Error in device token registration:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// ── GET /api/notifications/preferences ─────────────────────────────────────

async function handleGetPreferences(req: VercelRequest, res: VercelResponse) {
  try {
    // Get user email from session
    const userEmail = await getSessionEmail(req);
    if (!userEmail) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Get existing preferences or create default
    let preferences = await getUserAlertPreferences(userEmail);
    if (!preferences) {
      preferences = await createDefaultPreferences(userEmail);
    }
    
    return res.status(200).json({
      saved_player_alerts: preferences.saved_player_alerts,
      daily_top_edge: preferences.daily_top_edge,
      game_day_alerts: preferences.game_day_alerts,
      updated_at: preferences.updated_at
    });
    
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// ── POST /api/notifications/preferences ────────────────────────────────────

async function handleUpdatePreferences(req: VercelRequest, res: VercelResponse) {
  try {
    const { saved_player_alerts, daily_top_edge, game_day_alerts } = req.body;
    
    // Validate input (all fields optional, but must be boolean if provided)
    const updates: Partial<Pick<AlertPreferencesDoc, 'saved_player_alerts' | 'daily_top_edge' | 'game_day_alerts'>> = {};
    
    if (saved_player_alerts !== undefined) {
      if (typeof saved_player_alerts !== 'boolean') {
        return res.status(400).json({
          error: 'Invalid preference value',
          details: 'saved_player_alerts must be boolean'
        });
      }
      updates.saved_player_alerts = saved_player_alerts;
    }
    
    if (daily_top_edge !== undefined) {
      if (typeof daily_top_edge !== 'boolean') {
        return res.status(400).json({
          error: 'Invalid preference value',
          details: 'daily_top_edge must be boolean'
        });
      }
      updates.daily_top_edge = daily_top_edge;
    }
    
    if (game_day_alerts !== undefined) {
      if (typeof game_day_alerts !== 'boolean') {
        return res.status(400).json({
          error: 'Invalid preference value',
          details: 'game_day_alerts must be boolean'
        });
      }
      updates.game_day_alerts = game_day_alerts;
    }
    
    // If no valid updates provided
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No valid updates provided',
        details: 'Provide at least one valid boolean preference value'
      });
    }
    
    // Get user email from session
    const userEmail = await getSessionEmail(req);
    if (!userEmail) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Get existing preferences or create default
    let preferences = await getUserAlertPreferences(userEmail);
    if (!preferences) {
      preferences = await createDefaultPreferences(userEmail);
    }
    
    // Update preferences
    const docId = generatePreferencesId(userEmail);
    const now = new Date().toISOString();
    
    const updatedPrefs: Omit<AlertPreferencesDoc, 'id'> = {
      user_email: userEmail,
      saved_player_alerts: updates.saved_player_alerts ?? preferences.saved_player_alerts,
      daily_top_edge: updates.daily_top_edge ?? preferences.daily_top_edge,
      game_day_alerts: updates.game_day_alerts ?? preferences.game_day_alerts,
      created_at: preferences.created_at,
      updated_at: now,
    };
    
    await setDocument('alert_preferences', docId, updatedPrefs);
    
    return res.status(200).json({
      success: true,
      message: 'Preferences updated',
      preferences: {
        saved_player_alerts: updatedPrefs.saved_player_alerts,
        daily_top_edge: updatedPrefs.daily_top_edge,
        game_day_alerts: updatedPrefs.game_day_alerts,
        updated_at: updatedPrefs.updated_at
      }
    });
    
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// ── Main handler ───────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply CORS
  applyCors(req, res);
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Verify JWT for all endpoints
  const jwtValid = await verifyJwt(req);
  if (!jwtValid) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Route based on method and path
  const path = req.url?.split('?')[0] || '';
  
  if (req.method === 'POST' && path.endsWith('/register')) {
    return handleRegister(req, res);
  }
  
  if (req.method === 'GET' && path.endsWith('/preferences')) {
    return handleGetPreferences(req, res);
  }
  
  if (req.method === 'POST' && path.endsWith('/preferences')) {
    return handleUpdatePreferences(req, res);
  }
  
  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}