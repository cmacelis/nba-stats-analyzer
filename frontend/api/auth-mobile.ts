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

// ── POST /api/auth-mobile/signin ────────────────────────────────────────────

async function handleSignIn(req: VercelRequest, res: VercelResponse) {
  try {
    const { email, direct = true } = req.body as SignInRequest;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid email required' 
      } as SignInResponse);
    }
    
    // Get or create user
    const user = await getOrCreateUser(email);
    
    // For mobile development: return token directly
    // In production, this would send a magic link email
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
        ? 'Signed in successfully (development mode)' 
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
    
    // Default: return available endpoints
    return res.status(404).json({
      error: 'Endpoint not found',
      available_endpoints: [
        'POST /api/auth-mobile/signin',
        'GET /api/auth-mobile/session',
        'POST /api/auth-mobile/signout',
      ],
    });
    
  } catch (error) {
    console.error('[auth-mobile] Handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}