import { getEdgeFeed } from '../services/edgeService.js';
import { getOrCreateUser } from '../services/userService.js';
import { checkThrottle, checkDailyLimit } from '../services/rateLimiter.js';
import { formatBriefing } from '../formatters/briefingFormatter.js';

export async function handleEdges(bot, msg) {
  const chatId = msg.chat.id;

  if (!checkThrottle(chatId)) {
    return bot.sendMessage(chatId, 'Slow down \u2014 1 query every 3 seconds.');
  }

  await getOrCreateUser(chatId, msg.from?.username);
  const { allowed } = await checkDailyLimit(chatId);
  if (!allowed) {
    return bot.sendMessage(chatId,
      'Daily limit reached (5/5). Upgrade to Pro for unlimited queries.\n/subscribe',
    );
  }

  bot.sendChatAction(chatId, 'typing');

  try {
    const stat = process.env.BRIEFING_STAT || 'pts';
    const season = process.env.BRIEFING_SEASON || '2025';
    const minMin = process.env.BRIEFING_MIN_MINUTES || '20';

    const data = await getEdgeFeed(stat, minMin, season);
    const edges = data.data || [];
    const message = formatBriefing(edges, stat);
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    console.log(`[edges] ${msg.from?.username || chatId}: returned ${edges.length} edges`);
  } catch (err) {
    console.error('[edges] error:', err.message);
    await bot.sendMessage(chatId, 'Could not fetch edges right now. Try again later.');
  }
}
