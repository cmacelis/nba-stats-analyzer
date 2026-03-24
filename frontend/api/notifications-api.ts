/**
 * notifications-api.ts — notification endpoints for mobile app
 * 
 * Consolidated into a single file to avoid Vercel deployment issues.
 * 
 * Routes:
 *   POST /api/notifications-api/register          → register device token
 *   GET  /api/notifications-api/preferences       → get notification preferences
 *   POST /api/notifications-api/preferences       → update notification preferences
 * 
 * Authentication: Requires Bearer token (mobile auth)
 * Database: Firestore collections 'device_tokens' and 'alert_preferences'
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';
import { verifyJwt } from './_auth.js';
import { setDocument, getDocument } from './alerts/_firebase.js';

// ── Types ───────────────────────────────────────────────────────────────────

interface DeviceTokenDoc {
  id: string;
  user_email: string;
  device_token: string;
  platform: 'ios' | 'android';
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

interface AlertPreferencesDoc {
  id: string;
  user_email: string;
  saved_player_alerts: boolean;
  daily_top_edge: boolean;
  game_day_alerts: boolean;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

// ── Helper: Generate device token ID ────────────────────────────────────────

function generateDeviceTokenId(userEmail: string, deviceToken: string): string {
  const safeEmail = userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const tokenHash = Buffer.from(deviceToken).toString('base64').slice(0, 20).replace(/[^a-zA-Z0-9]/g, '');
  return `${safeEmail}_${tokenHash}`;
}

// ── Helper: Verify authentication ───────────────────────────────────────────

async function verifyAuth(req: VercelRequest): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  const session = await verifyJwt(token);
  return session?.email || null;
}

// ── Handler: Register device token ──────────────────────────────────────────

async function handleRegister(req: VercelRequest, res: VercelResponse) {
  try {
    const userEmail = await verifyAuth(req);
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized - no token' });
    }
    
    const { device_token, platform = 'ios' } = req.body;
    
    if (!device_token) {
      return res.status(400).json({ error: 'Missing device_token' });
    }
    
    if (!['ios', 'android'].includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }
    
    // Generate document ID
    const docId = generateDeviceTokenId(userEmail, device_token);
    const now = new Date().toISOString();
    
    // Create/update device token document
    const deviceDoc: DeviceTokenDoc = {
      id: docId,
      user_email: userEmail,
      device_token,
      platform: platform as 'ios' | 'android',
      created_at: now,
      updated_at: now,
    };
    
    await setDocument('device_tokens', docId, deviceDoc);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Device token registered',
      docId 
    });
  } catch (error) {
    console.error('Device registration error:', error);
    return res.status(500).json({ error: 'Failed to register device token' });
  }
}

// ── Handler: Get notification preferences ───────────────────────────────────

async function handleGetPreferences(req: VercelRequest, res: VercelResponse) {
  try {
    const userEmail = await verifyAuth(req);
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized - no token' });
    }
    
    const docId = userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Try to get existing preferences
    const existing = await getDocument('alert_preferences', docId);
    
    if (existing) {
      const prefs: AlertPreferencesDoc = {
        id: existing.id as string,
        user_email: existing.user_email as string,
        saved_player_alerts: existing.saved_player_alerts as boolean,
        daily_top_edge: existing.daily_top_edge as boolean,
        game_day_alerts: existing.game_day_alerts as boolean,
        created_at: existing.created_at as string,
        updated_at: existing.updated_at as string,
      };
      return res.status(200).json(prefs);
    }
    
    // Return default preferences if none exist
    const defaultPrefs: AlertPreferencesDoc = {
      id: docId,
      user_email: userEmail,
      saved_player_alerts: true,
      daily_top_edge: true,
      game_day_alerts: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    return res.status(200).json(defaultPrefs);
  } catch (error) {
    console.error('Get preferences error:', error);
    return res.status(500).json({ error: 'Failed to get preferences' });
  }
}

// ── Handler: Update notification preferences ────────────────────────────────

async function handleUpdatePreferences(req: VercelRequest, res: VercelResponse) {
  try {
    const userEmail = await verifyAuth(req);
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized - no token' });
    }
    
    const docId = userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const { saved_player_alerts, daily_top_edge, game_day_alerts } = req.body;
    
    // Get existing or create new
    const existing = await getDocument('alert_preferences', docId);
    const now = new Date().toISOString();
    
    const prefsDoc: AlertPreferencesDoc = {
      id: docId,
      user_email: userEmail,
      saved_player_alerts: saved_player_alerts !== undefined ? saved_player_alerts : true,
      daily_top_edge: daily_top_edge !== undefined ? daily_top_edge : true,
      game_day_alerts: game_day_alerts !== undefined ? game_day_alerts : false,
      created_at: (existing?.created_at as string) || now,
      updated_at: now,
    };
    
    await setDocument('alert_preferences', docId, prefsDoc);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Preferences updated',
      preferences: prefsDoc
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    return res.status(500).json({ error: 'Failed to update preferences' });
  }
}

// ── Main handler ────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method || 'GET';
  
  // Extract subpath from /api/notifications-api/...
  const subpath = pathname.replace(/^\/api\/notifications-api\/?/, '');
  
  console.log(`[notifications-api] Path: ${pathname}, Subpath: ${subpath}, Method: ${method}`);
  
  // Route handling
  if (subpath === 'register' && method === 'POST') {
    return await handleRegister(req, res);
  } else if (subpath === 'preferences') {
    if (method === 'GET') {
      return await handleGetPreferences(req, res);
    } else if (method === 'POST') {
      return await handleUpdatePreferences(req, res);
    }
  } else if (subpath === '' && method === 'GET') {
    // Root endpoint - list available routes
    return res.status(200).json({
      available_endpoints: [
        'POST /api/notifications-api/register',
        'GET /api/notifications-api/preferences',
        'POST /api/notifications-api/preferences'
      ],
      timestamp: new Date().toISOString()
    });
  }
  
  // No match
  return res.status(404).json({ 
    error: 'Endpoint not found',
    available_endpoints: [
      'POST /api/notifications-api/register',
      'GET /api/notifications-api/preferences',
      'POST /api/notifications-api/preferences'
    ]
  });
}