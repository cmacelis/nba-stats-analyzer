/**
 * EdgeDetector Telegram Bot — main entry point.
 *
 * Long-polling bot (no Vercel function slot needed).
 * Pattern follows discord-bot/index.js.
 */

// dotenv MUST run before anything reads process.env
import { config } from 'dotenv';
config();

// Now safe to import everything (env vars are loaded)
import TelegramBot from 'node-telegram-bot-api';
import { handleStart } from './commands/start.js';
import { handleHelp } from './commands/help.js';
import { handleProp, handleNaturalQuery } from './commands/prop.js';
import { handlePlayer } from './commands/player.js';
import { handleEdges } from './commands/edges.js';
import { handleSubscribe } from './commands/subscribe.js';
import { handleStatus } from './commands/status.js';
import { handleMyStatus } from './commands/mystatus.js';
import { startBriefing } from './briefing.js';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token || token === 'PASTE_YOUR_TOKEN_HERE') {
  console.error('TELEGRAM_BOT_TOKEN not set in .env');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// ── Command routing ─────────────────────────────────────────────────────────

bot.onText(/\/start/, (msg) => {
  handleStart(bot, msg).catch(err => console.error('[start] error:', err.message));
});

bot.onText(/\/help/, (msg) => {
  handleHelp(bot, msg).catch(err => console.error('[help] error:', err.message));
});

bot.onText(/\/prop\s+(.+)/, (msg, match) => {
  handleProp(bot, msg, match[1]).catch(err => console.error('[prop] error:', err.message));
});

bot.onText(/\/player\s+(.+)/, (msg, match) => {
  handlePlayer(bot, msg, match[1]).catch(err => console.error('[player] error:', err.message));
});

bot.onText(/\/edges/, (msg) => {
  handleEdges(bot, msg).catch(err => console.error('[edges] error:', err.message));
});

bot.onText(/\/subscribe/, (msg) => {
  handleSubscribe(bot, msg).catch(err => console.error('[subscribe] error:', err.message));
});

bot.onText(/\/status/, (msg) => {
  handleStatus(bot, msg).catch(err => console.error('[status] error:', err.message));
});

bot.onText(/\/mystatus/, (msg) => {
  handleMyStatus(bot, msg).catch(err => console.error('[mystatus] error:', err.message));
});

// ── Natural language prop queries + fallback ────────────────────────────────

bot.on('message', (msg) => {
  if (msg.text?.startsWith('/')) return;
  if (!msg.text) return;
  handleNaturalQuery(bot, msg)
    .then(matched => {
      if (!matched) {
        bot.sendMessage(msg.chat.id,
          `I didn't catch that.\n\nTry: \`LeBron over 25.5 points\`\nOr use /help to see commands.`,
          { parse_mode: 'Markdown' },
        );
      }
    })
    .catch(err => console.error('[natural] error:', err.message));
});

// ── Daily briefing scheduler ────────────────────────────────────────────────

startBriefing(bot);

// ── Error handlers ──────────────────────────────────────────────────────────

bot.on('polling_error', (err) => {
  console.error('[polling] error:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

console.log('EdgeBot started (Telegram, long-polling)');
console.log(`API: ${process.env.EDGE_API_BASE_URL || process.env.API_BASE_URL}`);
console.log(`Briefing: ${process.env.BRIEFING_TIME_ET || '09:00'} ET daily`);
