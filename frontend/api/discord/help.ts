/**
 * POST /api/discord/help
 *
 * Posts a pinnable "How it works" reference embed to the Discord webhook channel.
 * Run this once during setup, then pin the message in the alerts channel.
 *
 * Required env vars:
 *   DISCORD_WEBHOOK_URL  — already scoped to the target channel when created
 *
 * Optional env vars:
 *   SITE_URL             — for Edge Feed deep-link (auto-detected from VERCEL_URL)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib.js';

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const SITE_URL    = process.env.SITE_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!WEBHOOK_URL) return res.status(400).json({ error: 'DISCORD_WEBHOOK_URL not configured' });

  const embed = {
    title:       '📖 NBA Edge Detector — How It Works',
    color:       0x6366f1, // indigo
    description: 'Automated alerts for NBA player **prop betting edges** — last-5-game average vs season average.',
    fields: [
      {
        name:   '📈 What is an Edge?',
        value:  'An **edge** is a meaningful gap between a player\'s last-5-game avg and their season avg. It signals that their current form diverges from their established baseline — useful for over/under props.',
        inline: false,
      },
      {
        name:   '🔥 Over Edge',
        value:  'L5 avg is **above** season avg → player trending hot. Lean **Over** on their prop line.',
        inline: true,
      },
      {
        name:   '🧊 Under Edge',
        value:  'L5 avg is **below** season avg → player trending cold. Lean **Under** on their prop line.',
        inline: true,
      },
      {
        name:   '\u200b',
        value:  '\u200b',
        inline: false,
      },
      {
        name:   '🔔 Alerts (this channel)',
        value:  'Auto-posted when a player\'s Δ exceeds the threshold.\n**Default thresholds:** ±2.0 PTS · ±3.5 PRA\n**Cooldown:** 3 hrs per player/stat before re-alerting.\nEach alert shows Season Avg, L5 Avg, Δ, and a **Track this pick** deep-link.',
        inline: false,
      },
      {
        name:   '📊 Daily Digest',
        value:  'Top 5 biggest movers posted each morning.\nTriggered via `POST /api/discord/today` — add a daily cron to automate.',
        inline: false,
      },
      {
        name:   '➕ Track a Pick',
        value:  'Click **Track this pick** in any alert → Edge Feed opens with the Track modal **pre-filled** for that player/stat/direction. Enter an optional sportsbook line to upgrade it from a Signal to a Bet. One click to submit.',
        inline: false,
      },
      {
        name:   '⚙️ Tuning Alerts',
        value:  '`POST /api/alerts/run?stat=pts&direction=both&min_delta=1.5&min_minutes=15`\n`direction`: `over` · `under` · `both`\n`stat`: `pts` · `pra`\nAll params override env defaults per-run.',
        inline: false,
      },
      {
        name:   '\u200b',
        value:  SITE_URL ? `[🔗 Open Edge Feed](${SITE_URL}/edge)` : 'Set SITE_URL env var to enable deep links.',
        inline: false,
      },
    ],
    footer:    { text: 'NBA Edge Detector · pin this message · updated when config changes' },
    timestamp: new Date().toISOString(),
  };

  try {
    const webhookRes = await fetch(WEBHOOK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ embeds: [embed] }),
    });

    if (!webhookRes.ok) {
      const text = await webhookRes.text().catch(() => '');
      throw new Error(`Discord webhook ${webhookRes.status}: ${text.slice(0, 200)}`);
    }

    return res.json({ ok: true, message: 'Help embed posted — pin it in your Discord channel!' });
  } catch (err) {
    console.error('[discord/help] error:', (err as Error).message);
    return res.status(500).json({ error: 'Failed to post help embed', detail: (err as Error).message });
  }
}
