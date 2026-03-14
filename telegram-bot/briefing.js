/**
 * Daily Briefing — scheduled edge digest.
 *
 * Sends top 5 NBA edges to all subscribed Telegram users at 9:00 AM ET.
 * Uses Firestore for idempotency (same pattern as discord-bot/edgeOfDay.js).
 */

import cron from 'node-cron';
import { getEdgeFeed } from './services/edgeService.js';
import { getAllBriefingSubscribers } from './services/userService.js';
import { formatBriefing } from './formatters/briefingFormatter.js';

let API_KEY, FS_BASE;

// ── Firestore idempotency ───────────────────────────────────────────────────

async function getLastPostedDate() {
  try {
    const res = await fetch(`${FS_BASE}/meta/telegram_briefing?key=${API_KEY}`);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const doc = await res.json();
    return doc.fields?.lastPostedDate?.stringValue || null;
  } catch { return null; }
}

async function setLastPostedDate(dateStr) {
  const fields = { lastPostedDate: { stringValue: dateStr } };
  const res = await fetch(
    `${FS_BASE}/meta/telegram_briefing?updateMask.fieldPaths=lastPostedDate&key=${API_KEY}`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) },
  );
  if (!res.ok) console.error(`[briefing] Failed to update Firestore: ${res.status}`);
}

// ── Send briefing to all subscribers ────────────────────────────────────────

async function sendBriefing(bot) {
  const now = new Date();
  const etDate = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  // Idempotency check
  const lastDate = await getLastPostedDate();
  if (lastDate === etDate) {
    console.log(`[briefing] Already sent for ${etDate}, skipping`);
    return;
  }

  const stat = process.env.BRIEFING_STAT || 'pts';
  const season = process.env.BRIEFING_SEASON || '2025';
  const minMin = process.env.BRIEFING_MIN_MINUTES || '20';

  // Fetch edges
  let edges;
  try {
    const data = await getEdgeFeed(stat, minMin, season);
    edges = data.data || [];
  } catch (err) {
    console.error('[briefing] Failed to fetch edges:', err.message);
    return;
  }

  if (edges.length === 0) {
    console.log('[briefing] No edges available, skipping');
    return;
  }

  const message = formatBriefing(edges, stat);

  // Get subscribers
  const subscribers = await getAllBriefingSubscribers();
  if (subscribers.length === 0) {
    console.log('[briefing] No subscribers yet');
    await setLastPostedDate(etDate);
    return;
  }

  console.log(`[briefing] Sending to ${subscribers.length} subscribers...`);

  let sent = 0;
  for (const chatId of subscribers) {
    try {
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      sent++;
    } catch (err) {
      // 403 = user blocked the bot, 400 = chat not found
      if (err.response?.statusCode === 403 || err.response?.statusCode === 400) {
        console.log(`[briefing] Subscriber ${chatId} unreachable, skipping`);
      } else {
        console.error(`[briefing] Failed to send to ${chatId}:`, err.message);
      }
    }
    // 1s delay between sends (Telegram rate limit)
    await new Promise(r => setTimeout(r, 1000));
  }

  await setLastPostedDate(etDate);
  console.log(`[briefing] Sent ${etDate} to ${sent}/${subscribers.length} subscribers`);
}

// ── Scheduler entry point ───────────────────────────────────────────────────

export function startBriefing(bot) {
  const projectId = process.env.FIREBASE_PROJECT_ID || '';
  API_KEY = process.env.FIREBASE_API_KEY || '';
  FS_BASE = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

  const timeET = process.env.BRIEFING_TIME_ET || '09:00';
  const [hour, minute] = timeET.split(':').map(Number);
  const cronExpr = `${minute} ${hour} * * *`;

  cron.schedule(cronExpr, async () => {
    try {
      await sendBriefing(bot);
    } catch (err) {
      console.error('[briefing] error:', err.message || err);
    }
  }, { timezone: 'America/New_York' });

  console.log(`[briefing] Scheduled at ${timeET} ET daily`);

  // Catch-up on startup (same pattern as discord-bot)
  setTimeout(async () => {
    try {
      await sendBriefing(bot);
    } catch (err) {
      console.error('[briefing] startup check error:', err.message || err);
    }
  }, 5000);
}
