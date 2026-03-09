/**
 * stripe/webhook.ts — Stripe webhook handler.
 *
 * POST /api/stripe/webhook
 *
 * Handles:
 *   - checkout.session.completed → link Stripe customer to user, activate VIP
 *   - customer.subscription.updated → sync VIP status + period end
 *   - customer.subscription.deleted → deactivate VIP
 *
 * Requires: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { getUserByEmail, getOrCreateUser, updateUserByEmail } from '../_auth.js';

// Disable Vercel's automatic body parsing so we can verify the raw signature
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

// ── Event handlers ───────────────────────────────────────────────────────────

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

/** Extract period end from subscription (field still exists at runtime but removed from 2026 types). */
function extractPeriodEnd(sub: Stripe.Subscription): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const periodEnd = (sub as any).current_period_end;
  if (typeof periodEnd === 'number') return new Date(periodEnd * 1000).toISOString();
  return null;
}
