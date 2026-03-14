import { getResearch } from '../services/edgeService.js';
import { getOrCreateUser } from '../services/userService.js';
import { checkThrottle, checkDailyLimit } from '../services/rateLimiter.js';
import { formatPlayerResponse } from '../formatters/playerFormatter.js';

export async function handlePlayer(bot, msg, playerName) {
  const chatId = msg.chat.id;

  if (!playerName?.trim()) {
    return bot.sendMessage(chatId, 'Usage: `/player LeBron James`', { parse_mode: 'Markdown' });
  }

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
    const data = await getResearch(playerName.trim(), 'points');
    if (!data.playerName) {
      return bot.sendMessage(chatId, `Player "${playerName}" not found. Try a full name.`);
    }

    const message = formatPlayerResponse(data);
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    console.log(`[player] ${msg.from?.username || chatId}: ${playerName} -> ${data.playerName}`);
  } catch (err) {
    console.error(`[player] error for "${playerName}":`, err.message);
    if (err.response?.status === 404) {
      return bot.sendMessage(chatId, `Player "${playerName}" not found.`);
    }
    await bot.sendMessage(chatId, 'Something went wrong. Try again in a moment.');
  }
}
