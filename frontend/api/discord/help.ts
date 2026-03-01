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

  const edgeLink    = SITE_URL ? `[🔗 Edge Feed](${SITE_URL}/edge)` : null;
  const predictLink = SITE_URL ? `[🔮 Game Predictor](${SITE_URL}/predict)` : null;
  const ctaLine     = [edgeLink, predictLink].filter(Boolean).join('  ·  ')
    || 'Set SITE_URL env var to enable deep links.';

  const embed = {
    title:       '📖 NBA Edge Detector — VIP Alerts Room',
    color:       0x6366f1, // indigo
    description: 'Automated alerts for NBA player **prop betting edges** — last-5-game average vs season average. Pin this message for quick reference.',
    fields: [
      {
        name:   '📈 What is an Edge?',
        value:  'An **edge** is a meaningful gap between a player\'s last-5-game avg and their season avg. Large positive Δ = trending hot (Over signal). Large negative Δ = trending cold (Under signal).',
        inline: false,
      },
      {
        name:   '🔥 Over Edge',
        value:  'L5 avg **above** season avg — lean **Over** on their prop line.',
        inline: true,
      },
      {
        name:   '🧊 Under Edge',
        value:  'L5 avg **below** season avg — lean **Under** on their prop line.',
        inline: true,
      },
      {
        name:   '\u200b',
        value:  '\u200b',
        inline: false,
      },
      {
        name:   '🔔 Alerts (this channel)',
        value:  'Auto-posted when Δ exceeds the threshold.\n**Thresholds:** ±2.0 PTS · ±3.5 PRA\n**Cooldown:** 3 hrs per player/stat/direction\nEach alert includes a **Track this pick** deep-link → 1-click to log the signal.',
        inline: false,
      },
      {
        name:   '📊 /today — Daily Digest',
        value:  'Top 5 PTS + Top 5 PRA movers posted each morning as two embeds.\n`POST /api/discord/today` — set a daily cron to automate.',
        inline: false,
      },
      {
        name:   '🔮 /predict — Game Predictor',
        value:  predictLink
          ? `Use ${predictLink} to run head-to-head stat comparisons and win-probability estimates before picking sides. Full interactive tool on the web.`
          : 'Head-to-head stat comparison + win-probability tool. Set SITE_URL to get the deep-link here.',
        inline: false,
      },
      {
        name:   '➕ Track a Pick',
        value:  'Click **Track this pick** in any alert → Edge Feed opens with the Track modal pre-filled (player, stat, direction). Add a sportsbook line to upgrade from Signal → Bet. One click to submit.',
        inline: false,
      },
      {
        name:   '⚙️ Tuning Alerts',
        value:  '`POST /api/alerts/run?stat=pts&direction=both&min_delta=1.5&min_minutes=15`\n`direction`: `over` `under` `both` · `stat`: `pts` `pra`',
        inline: false,
      },
      {
        name:   '\u200b',
        value:  ctaLine,
        inline: false,
      },
    ],
    footer:    { text: 'NBA Edge Detector · pin this message · re-run /help after config changes' },
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
