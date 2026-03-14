/**
 * analytics.ts — Lightweight wrapper around @vercel/analytics track()
 * plus server-side funnel event recording via our own API.
 *
 * Usage:
 *   import { funnelEvent, trackServerFunnel } from '../lib/analytics';
 *   funnelEvent('sign-in-start');
 *   trackServerFunnel('pricing_view', { sourcePage: '/pricing' });
 */

import { track } from '@vercel/analytics';

type FunnelEvent =
  | 'sign-in-start'
  | 'pricing-view'
  | 'vip-cta-click'
  | 'free-cta-click'
  | 'edge-feed-view'
  | 'compare-view'
  | 'matchup-view'
  | 'prop-analyzer-view'
  | 'wnba-analyzer-view'
  | 'checkout-success';

export function funnelEvent(
  event: FunnelEvent,
  props?: Record<string, string | number | boolean>,
): void {
  track(event, props);
}

// ── Server-side funnel event types ──────────────────────────────────────────

type ServerFunnelEvent =
  | 'pricing_view'
  | 'free_cta_click'
  | 'vip_checkout_start';

/**
 * Record a funnel event to our own backend (Firestore via /api/auth?_subpath=funnel/track).
 * Fire-and-forget — never blocks UI.
 */
export function trackServerFunnel(
  eventType: ServerFunnelEvent,
  opts?: {
    sessionId?: string;
    planContext?: string;
    sourcePage?: string;
    metadata?: Record<string, unknown>;
  },
): void {
  fetch('/api/auth?_subpath=funnel/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({
      eventType,
      sessionId: opts?.sessionId,
      planContext: opts?.planContext,
      sourcePage: opts?.sourcePage,
      metadata: opts?.metadata,
    }),
  }).catch(() => {
    // Best-effort, never block UI
  });
}
