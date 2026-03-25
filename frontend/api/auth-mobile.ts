/**
 * auth-mobile.ts — simplified auth endpoint for mobile app
 * 
 * Phase 3: Mobile-friendly authentication that returns tokens directly
 * (No email sending required for development/testing)
 * 
 * Routes:
 *   POST /api/auth-mobile/signin  → create session and return token directly
 *   GET  /api/auth-mobile/session → validate token and return user info
 *   POST /api/auth-mobile/signout → clear session
 * 
 * Note: This is a simplified version for mobile development.
 * In production, this would use the same magic link system as web.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';
import { 
  getOrCreateUser, 
  signJwt, 
  verifyJwt,
  getSessionEmail,
  setSessionCookie,
  clearSessionCookie 
} from './_auth.js';

// ── Types ───────────────────────────────────────────────────────────────────

interface SignInRequest {
  email: string;
  // For mobile dev: we accept a "direct" flag to skip email sending
  direct?: boolean;
}

interface SignInResponse {
  success: boolean;
  token?: string;
  user?: {
    email: string;
    vipActive: boolean;
    vipPlan: string | null;
  };
  message: string;
}

// ── Mobile auth key validation ──────────────────────────────────────────────

function validateMobileAuthKey(req: VercelRequest): boolean {
  const key = req.headers['x-mobile-auth-key'] as string | undefined;
  const expected = process.env.MOBILE_AUTH_KEY;
  if (!expected) {
    console.error('[auth-mobile] MOBILE_AUTH_KEY env var is not set — rejecting all signin requests');
    return false;
  }
  return key === expected;
}

// ── POST /api/auth-mobile/signin ────────────────────────────────────────────

async function handleSignIn(req: VercelRequest, res: VercelResponse) {
  try {
    // Require X-Mobile-Auth-Key header to prevent unauthorized token minting
    if (!validateMobileAuthKey(req)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden — invalid or missing mobile auth key',
      } as SignInResponse);
    }

    const { email, direct = true } = req.body as SignInRequest;

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Valid email required'
      } as SignInResponse);
    }

    // Get or create user
    const user = await getOrCreateUser(email);

    // Return token directly for mobile app
    const token = await signJwt(email);

    // Set session cookie (for web compatibility)
    setSessionCookie(res, token);

    return res.json({
      success: true,
      token, // Return token for mobile to store
      user: {
        email: user.email,
        vipActive: user.vipActive,
        vipPlan: user.vipPlan,
      },
      message: direct
        ? 'Signed in successfully'
        : 'Magic link sent to email',
    } as SignInResponse);

  } catch (error) {
    console.error('[auth-mobile] Sign in error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    } as SignInResponse);
  }
}

// ── GET /api/auth-mobile/session ────────────────────────────────────────────

async function handleSession(req: VercelRequest, res: VercelResponse) {
  try {
    // Try to get session from cookie first (web compatibility)
    const emailFromCookie = await getSessionEmail(req);
    
    // Also check for token in Authorization header (mobile)
    const authHeader = req.headers.authorization;
    let emailFromToken: string | null = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await verifyJwt(token);
      if (payload) {
        emailFromToken = payload.email;
      }
    }
    
    const email = emailFromCookie || emailFromToken;
    
    if (!email) {
      return res.json({
        authenticated: false,
        message: 'No valid session',
      });
    }
    
    // Get user info
    const { getUserByEmail } = await import('./_auth.js');
    const user = await getUserByEmail(email);
    
    if (!user) {
      return res.json({
        authenticated: false,
        message: 'User not found',
      });
    }
    
    return res.json({
      authenticated: true,
      user: {
        email: user.email,
        vipActive: user.vipActive,
        vipPlan: user.vipPlan,
        vipCurrentPeriodEnd: user.vipCurrentPeriodEnd,
      },
    });
    
  } catch (error) {
    console.error('[auth-mobile] Session error:', error);
    return res.status(500).json({
      authenticated: false,
      message: 'Internal server error',
    });
  }
}

// ── POST /api/auth-mobile/signout ───────────────────────────────────────────

async function handleSignOut(req: VercelRequest, res: VercelResponse) {
  try {
    // Clear session cookie
    clearSessionCookie(res);
    
    return res.json({
      success: true,
      message: 'Signed out successfully',
    });
    
  } catch (error) {
    console.error('[auth-mobile] Sign out error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

// ── Main handler ────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Extract subpath
  const subpath = req.query._subpath as string | undefined;
  
  try {
    if (req.method === 'POST' && subpath === 'signin') {
      return await handleSignIn(req, res);
    }
    
    if (req.method === 'GET' && subpath === 'session') {
      return await handleSession(req, res);
    }
    
    if (req.method === 'POST' && subpath === 'signout') {
      return await handleSignOut(req, res);
    }
    
    // Notification endpoints (added to stay within Vercel function limits)
    if (subpath === 'notifications/register' && req.method === 'POST') {
      return await handleNotificationRegister(req, res);
    }
    
    if (subpath === 'notifications/preferences') {
      if (req.method === 'GET') {
        return await handleGetNotificationPreferences(req, res);
      } else if (req.method === 'POST') {
        return await handleUpdateNotificationPreferences(req, res);
      }
    }
    
    // Default: return available endpoints
    return res.status(404).json({
      error: 'Endpoint not found',
      available_endpoints: [
        'POST /api/auth-mobile/signin',
        'GET /api/auth-mobile/session',
        'POST /api/auth-mobile/signout',
        'POST /api/auth-mobile/notifications/register',
        'GET /api/auth-mobile/notifications/preferences',
        'POST /api/auth-mobile/notifications/preferences',
      ],
      timestamp: '2026-03-24T18:15:00Z'  // Force cache bust
    });
    
  } catch (error) {
    console.error('[auth-mobile] Handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ── Notification handlers (copied from notifications.ts) ───────────────────

import { queryDocuments, setDocument, deleteDocument, addDocument, getDocument } from './alerts/_firebase.js';

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