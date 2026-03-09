/**
 * auth.ts — unified auth endpoint (single serverless function).
 *
 * Routes:
 *   POST /api/auth          → request magic link (body: { email })
 *   GET  /api/auth?token=x  → consume magic link, set cookie, redirect
 *   GET  /api/auth           → return session info (me)
 *   DELETE /api/auth         → sign out (clear cookie)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';
import {
  createMagicLink,
  validateAndConsumeMagicLink,
  sendMagicLinkEmail,
  getOrCreateUser,
  getUserByEmail,
  getSessionEmail,
  signJwt,
  setSessionCookie,
  clearSessionCookie,
} from './_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  try {
    switch (req.method) {
      case 'POST':
        return await handleRequestLink(req, res);
      case 'GET':
        return req.query.token
          ? await handleCallback(req, res)
          : await handleMe(req, res);
      case 'DELETE':
        return handleSignOut(res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('[auth] error:', (err as Error).message);
    return res.status(500).json({ error: 'Internal error' });
  }
}

// ── POST: Request magic link ─────────────────────────────────────────────────

async function handleRequestLink(req: VercelRequest, res: VercelResponse) {
  const email = (req.body?.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const token = await createMagicLink(email);
  await sendMagicLinkEmail(email, token);

  console.log(`[auth] magic link requested for ${email}`);
  return res.json({ ok: true });
}

// ── GET ?token=: Callback ────────────────────────────────────────────────────

async function handleCallback(req: VercelRequest, res: VercelResponse) {
  const token = req.query.token as string;
  const email = await validateAndConsumeMagicLink(token);

  if (!email) {
    const baseUrl = process.env.AUTH_BASE_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
    return res.redirect(302, `${baseUrl}/pricing?auth=expired`);
  }

  // Create or load user
  await getOrCreateUser(email);

  // Sign JWT + set cookie
  const jwt = await signJwt(email);
  setSessionCookie(res, jwt);

  console.log(`[auth] signed in: ${email}`);

  const baseUrl = process.env.AUTH_BASE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  return res.redirect(302, `${baseUrl}/pricing?auth=success`);
}

// ── GET: Me ──────────────────────────────────────────────────────────────────

async function handleMe(req: VercelRequest, res: VercelResponse) {
  const email = await getSessionEmail(req);
  if (!email) {
    return res.json({ authenticated: false });
  }

  const user = await getUserByEmail(email);
  if (!user) {
    return res.json({ authenticated: false });
  }

  return res.json({
    authenticated: true,
    email: user.email,
    vipActive: user.vipActive,
    vipPlan: user.vipPlan,
    vipCurrentPeriodEnd: user.vipCurrentPeriodEnd,
  });
}

// ── DELETE: Sign out ─────────────────────────────────────────────────────────

function handleSignOut(res: VercelResponse) {
  clearSessionCookie(res);
  return res.json({ ok: true });
}
