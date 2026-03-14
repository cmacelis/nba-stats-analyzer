/**
 * auth.ts — unified auth endpoint (single serverless function).
 *
 * Routes:
 *   POST /api/auth                            → request magic link (body: { email })
 *   GET  /api/auth?token=x                    → consume magic link, set cookie, redirect
 *   GET  /api/auth                            → return session info (me)
 *   DELETE /api/auth                          → sign out (clear cookie)
 *
 * Discord OAuth (_subpath routes):
 *   GET  /api/auth?_subpath=discord/start     → redirect to Discord OAuth
 *   GET  /api/auth?_subpath=discord/callback  → handle Discord callback
 *   GET  /api/auth?_subpath=discord/status    → return Discord connection status
 *
 * Admin (_subpath routes):
 *   GET  /api/auth?_subpath=admin/stats       → admin dashboard data (allowlisted emails only)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';
import Stripe from 'stripe';
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
  signShortJwt,
  verifyShortJwt,
  updateUserByEmail,
  assignDiscordVipRole,
} from './_auth.js';
import { listAllDocuments } from './alerts/_firebase.js';

// ── Discord config ──────────────────────────────────────────────────────────

const DISCORD_API = 'https://discord.com/api/v10';

function discordConfig() {
  return {
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    botToken: process.env.DISCORD_BOT_TOKEN || '',
    guildId: process.env.DISCORD_GUILD_ID || '1475350412331581502',
    vipRoleId: process.env.DISCORD_VIP_ROLE_ID || '1479925861158224025',
    redirectUri:
      process.env.DISCORD_REDIRECT_URI ||
      'https://edgedetector.ai/api/auth?_subpath=discord/callback',
    joinServer: process.env.DISCORD_JOIN_SERVER !== 'false', // default true
  };
}

function getBaseUrl(): string {
  return (
    process.env.AUTH_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  );
}

// ── Subpath extractor ───────────────────────────────────────────────────────

function getSubpath(req: VercelRequest): string {
  const qs = req.query._subpath;
  if (qs) return Array.isArray(qs) ? qs.join('/') : qs;
  return '';
}

// ── Main handler ────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  try {
    // Check for _subpath routes first (GET only)
    if (req.method === 'GET') {
      const subpath = getSubpath(req);
      if (subpath === 'discord/start') return await handleDiscordStart(req, res);
      if (subpath === 'discord/callback') return await handleDiscordCallback(req, res);
      if (subpath === 'discord/status') return await handleDiscordStatus(req, res);
      if (subpath === 'admin/stats') return await handleAdminStats(req, res);
    }

    // Original routes
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

// ── POST: Request magic link ────────────────────────────────────────────────

async function handleRequestLink(req: VercelRequest, res: VercelResponse) {
  const email = (req.body?.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  // Allow callers to specify a post-auth redirect (e.g. /edge?auth=free-signup)
  const redirectTo = (req.body?.redirectTo || '').trim() || undefined;

  const token = await createMagicLink(email, redirectTo);
  await sendMagicLinkEmail(email, token);

  console.log(`[auth] magic link requested for ${email}${redirectTo ? ` → ${redirectTo}` : ''}`);
  return res.json({ ok: true });
}

// ── GET ?token=: Magic-link callback ────────────────────────────────────────

async function handleCallback(req: VercelRequest, res: VercelResponse) {
  const token = req.query.token as string;
  const result = await validateAndConsumeMagicLink(token);

  if (!result) {
    return res.redirect(302, `${getBaseUrl()}/pricing?auth=expired`);
  }

  await getOrCreateUser(result.email);
  const jwt = await signJwt(result.email);
  setSessionCookie(res, jwt);

  // Redirect to the stored destination (e.g. /edge?auth=free-signup) or default
  const destination = result.redirectTo || '/pricing?auth=success';
  console.log(`[auth] signed in: ${result.email} → ${destination}`);
  return res.redirect(302, `${getBaseUrl()}${destination}`);
}

// ── GET: Me ─────────────────────────────────────────────────────────────────

async function handleMe(req: VercelRequest, res: VercelResponse) {
  const email = await getSessionEmail(req);
  if (!email) {
    return res.json({ authenticated: false });
  }

  const user = await getUserByEmail(email);
  if (!user) {
    return res.json({ authenticated: false });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = user as any;

  return res.json({
    authenticated: true,
    email: user.email,
    vipActive: user.vipActive,
    vipPlan: user.vipPlan,
    vipCurrentPeriodEnd: user.vipCurrentPeriodEnd,
    discordConnected: !!doc.discordUserId,
    discordUsername: doc.discordUsername || null,
  });
}

// ── DELETE: Sign out ────────────────────────────────────────────────────────

function handleSignOut(res: VercelResponse) {
  clearSessionCookie(res);
  return res.json({ ok: true });
}

// ═══════════════════════════════════════════════════════════════════════════
// Discord OAuth routes
// ═══════════════════════════════════════════════════════════════════════════

// ── GET _subpath=discord/start ──────────────────────────────────────────────

async function handleDiscordStart(req: VercelRequest, res: VercelResponse) {
  const email = await getSessionEmail(req);
  if (!email) {
    return res.redirect(302, `${getBaseUrl()}/pricing?auth=required`);
  }

  const cfg = discordConfig();
  if (!cfg.clientId) {
    return res.status(500).json({ error: 'DISCORD_CLIENT_ID not configured' });
  }

  // Sign a short-lived state JWT with user email + nonce
  const nonce = crypto.randomUUID();
  const state = await signShortJwt({ email, nonce, ts: Date.now() });

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: 'code',
    scope: 'identify guilds.join',
    prompt: 'consent',
    state,
  });

  const url = `https://discord.com/oauth2/authorize?${params.toString()}`;
  console.log(`[discord] OAuth start for ${email}`);
  return res.redirect(302, url);
}

// ── GET _subpath=discord/callback ───────────────────────────────────────────

async function handleDiscordCallback(req: VercelRequest, res: VercelResponse) {
  const baseUrl = getBaseUrl();
  const code = req.query.code as string | undefined;
  const stateToken = req.query.state as string | undefined;
  const error = req.query.error as string | undefined;

  // User denied
  if (error) {
    console.warn(`[discord] OAuth denied: ${error}`);
    return res.redirect(302, `${baseUrl}/?discord=denied`);
  }

  if (!code || !stateToken) {
    return res.redirect(302, `${baseUrl}/?discord=error`);
  }

  // Verify state JWT
  const statePayload = await verifyShortJwt(stateToken);
  if (!statePayload || !statePayload.email) {
    console.error('[discord] invalid or expired state JWT');
    return res.redirect(302, `${baseUrl}/?discord=error`);
  }

  const email = statePayload.email as string;
  const cfg = discordConfig();

  // Exchange code for access token
  let accessToken: string;
  try {
    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: cfg.redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text().catch(() => '');
      console.error(`[discord] token exchange failed ${tokenRes.status}: ${text.slice(0, 200)}`);
      return res.redirect(302, `${baseUrl}/?discord=error`);
    }

    const tokenData = await tokenRes.json();
    accessToken = tokenData.access_token;
  } catch (err) {
    console.error('[discord] token exchange error:', (err as Error).message);
    return res.redirect(302, `${baseUrl}/?discord=error`);
  }

  // Fetch Discord user profile
  let discordUserId: string;
  let discordUsername: string;
  try {
    const userRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      console.error(`[discord] users/@me failed ${userRes.status}`);
      return res.redirect(302, `${baseUrl}/?discord=error`);
    }

    const discordUser = await userRes.json();
    discordUserId = discordUser.id;
    discordUsername = discordUser.username;
  } catch (err) {
    console.error('[discord] fetch user error:', (err as Error).message);
    return res.redirect(302, `${baseUrl}/?discord=error`);
  }

  // Save Discord info to Firestore user doc
  await updateUserByEmail(email, {
    discordUserId,
    discordUsername,
    discordConnectedAt: new Date().toISOString(),
  });

  console.log(`[discord] linked ${email} → ${discordUsername} (${discordUserId})`);

  // Join server + assign role (best-effort)
  let roleAssigned = false;
  if (cfg.joinServer && cfg.botToken) {
    try {
      // Add user to guild (requires guilds.join scope + Bot token)
      const joinRes = await fetch(
        `${DISCORD_API}/guilds/${cfg.guildId}/members/${discordUserId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bot ${cfg.botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ access_token: accessToken }),
        },
      );

      if (joinRes.ok || joinRes.status === 201 || joinRes.status === 204) {
        console.log(`[discord] user ${discordUserId} joined/already in guild`);
      } else {
        const text = await joinRes.text().catch(() => '');
        console.warn(`[discord] guild join ${joinRes.status}: ${text.slice(0, 200)}`);
      }
    } catch (err) {
      console.warn('[discord] guild join error:', (err as Error).message);
    }

    // Assign VIP Pro role
    const user = await getUserByEmail(email);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (user && (user as any).vipActive) {
      roleAssigned = await assignDiscordVipRole(discordUserId);
    }
  }

  const suffix = roleAssigned ? 'connected' : 'connected_no_role';
  return res.redirect(302, `${baseUrl}/start-here?discord=${suffix}`);
}

// ── GET _subpath=discord/status ─────────────────────────────────────────────

async function handleDiscordStatus(req: VercelRequest, res: VercelResponse) {
  const email = await getSessionEmail(req);
  if (!email) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = await getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = user as any;

  return res.json({
    connected: !!doc.discordUserId,
    discordUserId: doc.discordUserId || null,
    discordUsername: doc.discordUsername || null,
    vipActive: user.vipActive,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Admin dashboard route
// ═══════════════════════════════════════════════════════════════════════════

/** Allowlisted admin emails — set ADMIN_EMAILS env var (comma-separated). */
function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

// ── GET _subpath=admin/stats ────────────────────────────────────────────────

async function handleAdminStats(req: VercelRequest, res: VercelResponse) {
  // 1. Auth check
  const email = await getSessionEmail(req);
  if (!email) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // 2. Admin allowlist check
  const admins = getAdminEmails();
  if (admins.length === 0) {
    return res.status(403).json({ error: 'No admin emails configured' });
  }
  if (!admins.includes(email.toLowerCase())) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  try {
    // 3. Fetch all users from Firestore
    const allUsers = await listAllDocuments('users');

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const totalUsers = allUsers.length;
    const vipUsers = allUsers.filter((u) => u.vipActive === true);
    const freeUsers = allUsers.filter((u) => !u.vipActive);

    // Recent signups (last 7 days)
    const recentSignups = allUsers
      .filter((u) => {
        const created = u.createdAt as string | undefined;
        return created && new Date(created) >= sevenDaysAgo;
      })
      .sort((a, b) => {
        const da = new Date(a.createdAt as string).getTime();
        const db = new Date(b.createdAt as string).getTime();
        return db - da;
      })
      .slice(0, 20)
      .map((u) => ({
        email: u.email,
        createdAt: u.createdAt,
        vipActive: u.vipActive ?? false,
        vipPlan: u.vipPlan ?? null,
        discordConnected: !!u.discordUserId,
      }));

    // Signups over time (last 30 days, by day)
    const signupsByDay: Record<string, number> = {};
    allUsers.forEach((u) => {
      const created = u.createdAt as string | undefined;
      if (created && new Date(created) >= thirtyDaysAgo) {
        const day = created.slice(0, 10); // YYYY-MM-DD
        signupsByDay[day] = (signupsByDay[day] || 0) + 1;
      }
    });

    // Discord connection rate
    const discordConnected = allUsers.filter((u) => !!u.discordUserId).length;

    // 4. Fetch recent Stripe events (best-effort)
    let stripeEvents: Array<{
      type: string;
      created: string;
      email: string | null;
      amount: number | null;
    }> = [];

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: '2026-02-25.clover' });
        const events = await stripe.events.list({
          limit: 25,
          types: [
            'checkout.session.completed',
            'customer.subscription.created',
            'customer.subscription.updated',
            'customer.subscription.deleted',
            'invoice.payment_succeeded',
            'invoice.payment_failed',
          ],
        });

        stripeEvents = events.data.map((e) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const obj = e.data.object as any;
          return {
            type: e.type,
            created: new Date(e.created * 1000).toISOString(),
            email: obj?.customer_email || obj?.customer_details?.email || null,
            amount: obj?.amount_total ? obj.amount_total / 100 : null,
          };
        });
      } catch (err) {
        console.error('[admin] Stripe events fetch error:', (err as Error).message);
      }
    }

    // 5. VIP breakdown
    const vipMonthly = vipUsers.filter((u) => u.vipPlan === 'monthly').length;
    const vipAnnual = vipUsers.filter((u) => u.vipPlan === 'annual').length;

    // Estimated MRR
    const estimatedMrr = vipMonthly * 19 + vipAnnual * Math.round(199 / 12);

    return res.json({
      generatedAt: now.toISOString(),
      users: {
        total: totalUsers,
        free: freeUsers.length,
        vip: vipUsers.length,
        vipMonthly,
        vipAnnual,
        discordConnected,
      },
      revenue: {
        estimatedMrr,
        note: 'MRR = (monthly × $19) + (annual × $16.58/mo)',
      },
      recentSignups,
      signupsByDay,
      stripeEvents,
    });
  } catch (err) {
    console.error('[admin] stats error:', (err as Error).message);
    return res.status(500).json({ error: 'Failed to load admin stats' });
  }
}
