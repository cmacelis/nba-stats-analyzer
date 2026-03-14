/**
 * stripe/[[...path]].ts — Combined Stripe handler (catch-all).
 *
 * Routes:
 *   POST /api/stripe/webhook  — Stripe webhook (signature-verified)
 *   POST /api/stripe/checkout — Create Checkout Session with client_reference_id
 *
 * Combined into one file to stay within the Vercel Hobby 12-function limit.
 * Requires: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import {
  getUserByEmail,
  getOrCreateUser,
  updateUserByEmail,
  assignDiscordVipRole,
} from '../_auth.js';

// Disable body parsing so we can verify the webhook raw signature
export const config = { api: { bodyParser: false } };

function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2026-02-25.clover',
  });
}

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req as unknown as AsyncIterable<Buffer>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

// ── Router ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathname = new URL(req.url!, `https://${req.headers.host}`).pathname;

  if (pathname.endsWith('/stripe/checkout')) {
    return handleCheckout(req, res);
  }
  if (pathname.endsWith('/stripe/webhook')) {
    return handleWebhook(req, res);
  }

  return res.status(404).json({ error: 'Not found' });
}

// ── Checkout Session Creator ────────────────────────────────────────────────

function getPriceId(plan: string): string | null {
  if (plan === 'monthly') return process.env.STRIPE_PRICE_MONTHLY || null;
  if (plan === 'annual') return process.env.STRIPE_PRICE_ANNUAL || null;
  return null;
}

async function handleCheckout(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  // Body parsing disabled globally — parse manually
  const rawBody = await readRawBody(req);
  let body: { plan?: string; ref?: string } = {};
  try {
    body = JSON.parse(rawBody.toString());
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { plan, ref } = body;
  if (!plan || (plan !== 'monthly' && plan !== 'annual')) {
    return res.status(400).json({ error: 'plan must be "monthly" or "annual"' });
  }

  const priceId = getPriceId(plan);
  if (!priceId) {
    return res.status(500).json({ error: `STRIPE_PRICE_${plan.toUpperCase()} env var not set` });
  }

  try {
    const stripe = getStripe();
    const baseUrl = process.env.CHECKOUT_SUCCESS_URL || 'https://edgedetector.ai';

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/pricing?checkout=success`,
      cancel_url: `${baseUrl}/pricing?checkout=cancel`,
    };

    if (ref && typeof ref === 'string') {
      sessionParams.client_reference_id = ref;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return res.json({ url: session.url });
  } catch (err) {
    const msg = (err as Error).message;
    console.error('[stripe/checkout] error:', msg);
    return res.status(500).json({ error: 'Failed to create checkout session', detail: msg });
  }
}

// ── Webhook Handler ─────────────────────────────────────────────────────────

async function handleWebhook(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[stripe] STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const sig = req.headers['stripe-signature'] as string;
  if (!sig) return res.status(400).json({ error: 'Missing stripe-signature' });

  let event: Stripe.Event;
  try {
    const rawBody = await readRawBody(req);
    event = getStripe().webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error('[stripe] signature verification failed:', (err as Error).message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  console.log(`[stripe] event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        console.log(`[stripe] unhandled event: ${event.type}`);
    }
  } catch (err) {
    console.error(`[stripe] handler error for ${event.type}:`, (err as Error).message);
    // Return 200 anyway so Stripe doesn't retry
  }

  return res.json({ received: true });
}

// ── Webhook Event Handlers ──────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const email = session.customer_details?.email || session.customer_email;
  if (!email) {
    console.error('[stripe] checkout.session.completed missing email');
    return;
  }

  const lowerEmail = email.toLowerCase();
  await getOrCreateUser(lowerEmail);

  const updates: Record<string, unknown> = {
    stripeCustomerId: session.customer as string,
  };

  // If subscription checkout, activate VIP immediately
  if (session.subscription) {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(session.subscription as string);
    updates.stripeSubscriptionId = sub.id;
    updates.vipActive = true;
    updates.vipPlan = determinePlan(sub);
    updates.vipCurrentPeriodEnd = extractPeriodEnd(sub);
  }

  await updateUserByEmail(lowerEmail, updates);
  console.log(`[stripe] checkout completed for ${lowerEmail}, VIP activated`);

  // Best-effort: assign Discord VIP role if user has connected Discord
  if (updates.vipActive) {
    await tryAssignDiscordRole(lowerEmail);
  }

  // Best-effort: link Telegram user if checkout came from Telegram bot
  const clientRef = session.client_reference_id;
  if (clientRef?.startsWith('tg_') && updates.vipActive) {
    await tryLinkTelegramUser(clientRef.slice(3), lowerEmail);
  }
}

async function handleSubscriptionUpdate(sub: Stripe.Subscription) {
  const email = await getEmailFromCustomer(sub.customer as string);
  if (!email) return;

  const isActive = sub.status === 'active' || sub.status === 'trialing';
  await updateUserByEmail(email, {
    stripeSubscriptionId: sub.id,
    vipActive: isActive,
    vipPlan: determinePlan(sub),
    vipCurrentPeriodEnd: extractPeriodEnd(sub),
  });

  console.log(`[stripe] subscription ${sub.id} updated for ${email}, active=${isActive}`);

  if (isActive) {
    await tryAssignDiscordRole(email);
  } else {
    await tryDeactivateTelegramUser(email);
  }
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const email = await getEmailFromCustomer(sub.customer as string);
  if (!email) return;

  await updateUserByEmail(email, {
    vipActive: false,
    vipPlan: null,
    vipCurrentPeriodEnd: null,
  });

  console.log(`[stripe] subscription ${sub.id} deleted for ${email}, VIP deactivated`);

  await tryDeactivateTelegramUser(email);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getEmailFromCustomer(customerId: string): Promise<string | null> {
  try {
    const customer = await getStripe().customers.retrieve(customerId);
    if (customer.deleted) return null;
    return (customer as Stripe.Customer).email?.toLowerCase() || null;
  } catch (err) {
    console.error(`[stripe] failed to retrieve customer ${customerId}:`, (err as Error).message);
    return null;
  }
}

function determinePlan(sub: Stripe.Subscription): string {
  const interval = sub.items.data[0]?.price?.recurring?.interval;
  if (interval === 'year') return 'annual';
  return 'monthly';
}

function extractPeriodEnd(sub: Stripe.Subscription): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const periodEnd = (sub as any).current_period_end;
  if (typeof periodEnd === 'number') return new Date(periodEnd * 1000).toISOString();
  return null;
}

async function tryAssignDiscordRole(email: string): Promise<void> {
  try {
    const user = await getUserByEmail(email);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const discordUserId = (user as any)?.discordUserId;
    if (!discordUserId) return;

    const ok = await assignDiscordVipRole(discordUserId);
    if (ok) {
      console.log(`[stripe] Discord VIP role assigned for ${email}`);
    }
  } catch (err) {
    console.error(`[stripe] Discord role assign error for ${email}:`, (err as Error).message);
  }
}

async function tryLinkTelegramUser(chatId: string, email: string): Promise<void> {
  try {
    const { base, key } = tgFirestore();
    const fields = {
      vipActive: { booleanValue: true },
      email: { stringValue: email },
      linkedAt: { stringValue: new Date().toISOString() },
    };
    const masks = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join('&');
    const res = await fetch(
      `${base}/telegram_users/chat_${chatId}?${masks}&key=${key}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      },
    );
    if (res.ok) {
      console.log(`[stripe] Telegram VIP activated for chat_${chatId} (${email})`);
    }
  } catch (err) {
    console.error(`[stripe] Telegram link error for chat_${chatId}:`, (err as Error).message);
  }
}

async function tryDeactivateTelegramUser(email: string): Promise<void> {
  try {
    const { base, key } = tgFirestore();

    const queryRes = await fetch(`${base}:runQuery?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'telegram_users' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'email' },
              op: 'EQUAL',
              value: { stringValue: email },
            },
          },
        },
      }),
    });
    if (!queryRes.ok) return;

    const results = await queryRes.json();
    for (const r of results) {
      if (!r.document?.name) continue;
      const docPath = r.document.name.split('/documents/')[1];
      if (!docPath) continue;

      const fields = { vipActive: { booleanValue: false } };
      await fetch(
        `${base}/${docPath}?updateMask.fieldPaths=vipActive&key=${key}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields }),
        },
      );
      const docId = docPath.split('/').pop();
      console.log(`[stripe] Telegram VIP deactivated for ${docId} (${email})`);
    }
  } catch (err) {
    console.error(`[stripe] Telegram deactivation error for ${email}:`, (err as Error).message);
  }
}

function tgFirestore() {
  const pid = process.env.FIREBASE_PROJECT_ID || '';
  const key = process.env.FIREBASE_API_KEY || '';
  return {
    key,
    base: `https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents`,
  };
}
