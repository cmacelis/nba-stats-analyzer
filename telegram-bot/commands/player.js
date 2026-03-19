import { getResearch } from '../services/edgeService.js';
import { getOrCreateUser } from '../services/userService.js';
import { checkThrottle, checkDailyLimit } from '../services/rateLimiter.js';
import { formatPlayerResponse } from '../formatters/playerFormatter.js';

export async function handlePlayer(bot, msg, args) {
  const chatId = msg.chat.id;

  // Parse arguments: /player LeBron James points
  const parts = args?.trim().split(/\s+/) || [];
  if (parts.length === 0) {
    return bot.sendMessage(chatId, 
      'Usage: `/player LeBron James [stat]`\n' +
      'Stats: points, assists, rebounds, steals, blocks, turnovers, fg_pct, three_pct, ft_pct\n' +
      'Example: `/player LeBron James rebounds`',
      { parse_mode: 'Markdown' }
    );
  }

  // Extract player name and stat type
  let playerName, statType = 'points';
  
  if (parts.length === 1) {
    // Only player name provided
    playerName = parts[0];
  } else {
    // Check if last part is a valid stat type
    const lastPart = parts[parts.length - 1].toLowerCase();
    const validStats = ['points', 'assists', 'rebounds', 'steals', 'blocks', 'turnovers', 'fg_pct', 'three_pct', 'ft_pct'];
    
    if (validStats.includes(lastPart)) {
      statType = lastPart;
      playerName = parts.slice(0, -1).join(' ');
    } else {
      // Last part is not a stat, treat everything as player name
      playerName = parts.join(' ');
    }
  }

  if (!playerName?.trim()) {
    return bot.sendMessage(chatId, 'Usage: `/player LeBron James [stat]`', { parse_mode: 'Markdown' });
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
    const data = await getResearch(playerName.trim(), statType);
    if (!data.playerName) {
      return bot.sendMessage(chatId, `Player "${playerName}" not found. Try a full name.`);
    }

    const message = formatPlayerResponse(data, statType);
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    console.log(`[player] ${msg.from?.username || chatId}: ${playerName} (${statType}) -> ${data.playerName}`);
  } catch (err) {
    console.error(`[player] error for "${playerName}" (${statType}):`, err.message);
    if (err.response?.status === 404) {
      return bot.sendMessage(chatId, `Player "${playerName}" not found.`);
    }
    await bot.sendMessage(chatId, 'Something went wrong. Try again in a moment.');
  }
}
