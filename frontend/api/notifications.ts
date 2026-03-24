/**
 * notifications.ts — notification endpoints for mobile app (entry point)
 * 
 * This file exists to make /api/notifications/* routes work with Vercel's
 * file-based routing. The actual implementation is in notifications/index.ts.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';
import { getSessionEmail, verifyJwt } from './_auth.js';
import { queryDocuments, setDocument, deleteDocument, addDocument, getDocument } from './alerts/_firebase.js';

// ── Types (re-exported from index.ts) ──────────────────────────────────────

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

// ── Main handler ───────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply CORS
  if (applyCors(req, res)) return;

  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method || 'GET';

  try {
    // Extract subpath from /api/notifications/{subpath}
    const subpath = pathname.replace('/api/notifications/', '');
    
    // Route based on subpath
    if (subpath === 'register' && method === 'POST') {
      return await handleRegister(req, res);
    } else if (subpath === 'preferences') {
      if (method === 'GET') {
        return await handleGetPreferences(req, res);
      } else if (method === 'POST') {
        return await handleUpdatePreferences(req, res);
      }
    }
    
    // No matching route
    res.status(404).json({ error: 'Not found', path: pathname });
  } catch (error) {
    console.error('Notifications handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── Route handlers ─────────────────────────────────────────────────────────

async function handleRegister(req: VercelRequest, res: VercelResponse) {
  try {
    // Verify authentication
    const session = await verifyJwt(req);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userEmail = session.email;
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

async function handleGetPreferences(req: VercelRequest, res: VercelResponse) {
  try {
    // Verify authentication
    const session = await verifyJwt(req);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userEmail = session.email;
    const docId = userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Try to get existing preferences
    const existing = await getDocument('alert_preferences', docId);
    
    if (existing) {
      return res.status(200).json(existing);
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

async function handleUpdatePreferences(req: VercelRequest, res: VercelResponse) {
  try {
    // Verify authentication
    const session = await verifyJwt(req);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userEmail = session.email;
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
      created_at: existing?.created_at || now,
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