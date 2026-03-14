import { getOrCreateUser } from '../services/userService.js';

export async function handleStart(bot, msg) {
  const chatId = msg.chat.id;
  const username = msg.from?.username || msg.from?.first_name || '';

  // Create user record on first interaction
  await getOrCreateUser(chatId, username);

  await bot.sendMessage(chatId,
    `*EdgeDetector.ai* \u2014 NBA Prop Edge Finder\n\n` +
    `I find edges in NBA player props by comparing recent performance against sportsbook lines.\n\n` +
    `*Quick Start:*\n` +
    `Just type a prop like:\n` +
    `\`LeBron over 25.5 points\`\n\n` +
    `*Commands:*\n` +
    `/player LeBron James \u2014 Season stats & form\n` +
    `/prop LeBron points \u2014 Prop analysis\n` +
    `/edges \u2014 Today's top 5 edges\n` +
    `/subscribe \u2014 Upgrade to Pro ($19/mo)\n` +
    `/status \u2014 Your plan & usage\n` +
    `/help \u2014 Full command list\n\n` +
    `Free tier: 5 queries/day \u2022 Pro: unlimited + daily briefing`,
    { parse_mode: 'Markdown' },
  );
}
