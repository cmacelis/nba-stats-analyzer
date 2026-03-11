/**
 * discord-results.ts handler — POST /api/discord/results
 * Posts W/L/P record for tracked bets (last 7d and 30d) to the Discord webhook.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { listPicks, KV_OK } from '../_picks.js';

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const SITE_URL    = process.env.SITE_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

function calcStats(picks: Awaited<ReturnType<typeof listPicks>>) {
  const settled  = picks.filter(p => p.result != null);
  const W        = settled.filter(p => p.result === 'W').length;
  const L        = settled.filter(p => p.result === 'L').length;
  const P        = settled.filter(p => p.result === 'P').length;
  const hitRate  = W + L > 0 ? Math.round((W / (W + L)) * 100) : null;
  return { total: picks.length, settled: settled.length, W, L, P, hitRate };
}

function formatLine(s: ReturnType<typeof calcStats>): string {
  const hitStr = s.hitRate != null ? ` (Hit rate ${s.hitRate}%)` : '';
  return `**${s.W}-${s.L}-${s.P}**${hitStr} — Settled ${s.settled}`;
}

export async function discordResultsHandler(req: VercelRequest, res: VercelResponse) {
  if (!['GET', 'POST'].includes(req.method || '')) return res.status(405).json({ error: 'Method not allowed' });
  if (!WEBHOOK_URL) return res.status(400).json({ error: 'DISCORD_WEBHOOK_URL not configured' });
  if (!KV_OK) return res.status(400).json({ error: 'KV not configured' });

  const now    = Date.now();
  const since30 = now - 30 * 24 * 60 * 60 * 1000;

  try {
    const allPicks = await listPicks(since30);
    const bets30   = allPicks.filter(p => p.type === 'bet');
    const bets7    = bets30.filter(p => new Date(p.created_at).getTime() >= now - 7 * 24 * 60 * 60 * 1000);

    const stats30 = calcStats(bets30);
    const stats7  = calcStats(bets7);

    const dashboardUrl = SITE_URL ? `${SITE_URL}/performance` : null;

    // No settled bets yet — post plain message
    if (stats30.settled === 0) {
      const webhookRes = await fetch(WEBHOOK_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ content: 'No settled bets yet — results appear after games complete.' }),
      });
      if (!webhookRes.ok) {
        const text = await webhookRes.text().catch(() => '');
        throw new Error(`Discord webhook ${webhookRes.status}: ${text.slice(0, 200)}`);
      }
      return res.json({ ok: true, settled: 0 });
    }

    const embed = {
      title:       '📊 Results (Bets only)',
      color:       0x22c55e, // green
      fields: [
        { name: 'Last 7 days',  value: formatLine(stats7),  inline: false },
        { name: 'Last 30 days', value: formatLine(stats30), inline: false },
        ...(dashboardUrl
          ? [{ name: '\u200b', value: `[📈 Dashboard](${dashboardUrl})`, inline: false }]
          : []),
      ],
      footer:    { text: 'EdgeDetector.ai · bets only · pushes excluded from hit rate' },
      timestamp: new Date().toISOString(),
    };

    const webhookRes = await fetch(WEBHOOK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ embeds: [embed] }),
    });

    if (!webhookRes.ok) {
      const text = await webhookRes.text().catch(() => '');
      throw new Error(`Discord webhook ${webhookRes.status}: ${text.slice(0, 200)}`);
    }

    return res.json({ ok: true, stats7d: stats7, stats30d: stats30 });
  } catch (err) {
    console.error('[discord/results] error:', (err as Error).message);
    return res.status(500).json({ error: 'Failed to post results', detail: (err as Error).message });
  }
}
