/**
 * _router.ts — unified serverless function for all consolidated endpoints.
 *
 * This single function routes to handlers based on the request path, reducing
 * Vercel Hobby function count from 14 to 5 (keeping health, edge, picks, alerts separate).
 *
 * Consolidated routes:
 *   GET  /api/games                      → gamesHandler
 *   GET  /api/players                    → playersHandler (search)
 *   GET  /api/players/:id/stats          → playerStatsHandler
 *   GET  /api/players/photo              → playerPhotoHandler
 *   GET  /api/players/compare/:id1/:id2  → compareHandler
 *   GET  /api/research/:playerName       → researchHandler
 *   POST /api/research/generate          → generateHandler
 *   GET  /api/discord/help               → discordHelpHandler
 *   GET  /api/discord/today              → discordTodayHandler
 *   POST /api/picks/settle               → picksSettleHandler
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';
import { gamesHandler } from './_handlers/games.js';
import { nbaPlayerSearchHandler } from './handlers/nba/players.js';
import { playerStatsHandler } from './_handlers/player-stats.js';
import { playerPhotoHandler } from './_handlers/player-photo.js';
import { compareHandler } from './_handlers/compare.js';
import { researchHandler } from './_handlers/research.js';
import { generateHandler } from './_handlers/generate.js';
import { discordHelpHandler } from './_handlers/discord-help.js';
import { discordTodayHandler } from './_handlers/discord-today.js';
import { picksSettleHandler } from './_handlers/picks-settle.js';
import { getSessionEmail, verifyJwt } from './_auth.js';
import { queryDocuments, setDocument, deleteDocument, addDocument, getDocument } from './alerts/_firebase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply CORS
  if (applyCors(req, res)) return;

  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method || 'GET';

  try {
    // Route based on path pattern
    if (pathname === '/api/games') {
      return await gamesHandler(req, res);
    }

    if (pathname === '/api/players') {
      return await nbaPlayerSearchHandler(req, res);
    }

    if (pathname === '/api/players/photo') {
      return await playerPhotoHandler(req, res);
    }

    // /api/players/:id/stats
    const playerStatsMatch = pathname.match(/^\/api\/players\/(\d+)\/stats$/);
    if (playerStatsMatch) {
      return await playerStatsHandler(req, res, playerStatsMatch[1]);
    }

    // /api/players/compare/:id1/:id2
    const compareMatch = pathname.match(/^\/api\/players\/compare\/(\d+)\/(\d+)$/);
    if (compareMatch) {
      return await compareHandler(req, res, compareMatch[1], compareMatch[2]);
    }

    // /api/research/:playerName (generate takes POST)
    if (pathname.startsWith('/api/research/')) {
      const segment = pathname.slice('/api/research/'.length);
      if (segment === 'generate') {
        if (method === 'POST') {
          return await generateHandler(req, res);
        } else {
          return res.status(405).json({ error: 'Method not allowed' });
        }
      }
      // Otherwise it's /api/research/:playerName
      return await researchHandler(req, res, segment);
    }

    // /api/discord/help
    if (pathname === '/api/discord/help') {
      return await discordHelpHandler(req, res);
    }

    // /api/discord/today
    if (pathname === '/api/discord/today') {
      return await discordTodayHandler(req, res);
    }

    // /api/picks/settle
    if (pathname === '/api/picks/settle') {
      return await picksSettleHandler(req, res);
    }

    // /api/notifications/* routes (via rewrite: /api/_router?_subpath=notifications/...)
    const subpath = req.query._subpath as string;
    if (subpath && subpath.startsWith('notifications/')) {
      const notificationPath = subpath.slice('notifications/'.length);
      
      if (notificationPath === 'register' && method === 'POST') {
        return await handleNotificationRegister(req, res);
      } else if (notificationPath === 'preferences') {
        if (method === 'GET') {
          return await handleGetNotificationPreferences(req, res);
        } else if (method === 'POST') {
          return await handleUpdateNotificationPreferences(req, res);
        }
      }
    }

    // No match
    res.status(404).json({ error: 'Not found' });
  } catch (err) {
    console.error('[_router] unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── Notification Handlers ──────────────────────────────────────────────────

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

function generateDeviceTokenId(userEmail: string, deviceToken: string): string {
  const safeEmail = userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const tokenHash = Buffer.from(deviceToken).toString('base64').slice(0, 20).replace(/[^a-zA-Z0-9]/g, '');
  return `${safeEmail}_${tokenHash}`;
}

async function handleNotificationRegister(req: VercelRequest, res: VercelResponse) {
  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - no token' });
    }
    
    const token = authHeader.substring(7);
    const session = await verifyJwt(token);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized - invalid token' });
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

async function handleGetNotificationPreferences(req: VercelRequest, res: VercelResponse) {
  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - no token' });
    }
    
    const token = authHeader.substring(7);
    const session = await verifyJwt(token);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized - invalid token' });
    }
    
    const userEmail = session.email;
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

async function handleUpdateNotificationPreferences(req: VercelRequest, res: VercelResponse) {
  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - no token' });
    }
    
    const token = authHeader.substring(7);
    const session = await verifyJwt(token);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized - invalid token' });
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
