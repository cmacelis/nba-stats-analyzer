/**
 * analytics.ts — Lightweight wrapper around @vercel/analytics track().
 *
 * Usage:
 *   import { funnelEvent } from '../lib/analytics';
 *   funnelEvent('sign-in-start');
 *   funnelEvent('pricing-view', { source: 'edge-feed-cta' });
 */

import { track } from '@vercel/analytics';

type FunnelEvent =
  | 'sign-in-start'
  | 'pricing-view'
  | 'vip-cta-click'
  | 'edge-feed-view'
  | 'compare-view'
  | 'matchup-view'
  | 'prop-analyzer-view'
  | 'wnba-analyzer-view';

export function funnelEvent(
  event: FunnelEvent,
  props?: Record<string, string | number | boolean>,
): void {
  track(event, props);
}
