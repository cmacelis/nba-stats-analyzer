import { getOrCreateUser } from '../services/userService.js';

const FREE_LIMIT = 5;

export async function handleStatus(bot, msg) {
  const chatId = msg.chat.id;
  const user = await getOrCreateUser(chatId, msg.from?.username);

  const plan = user.vipActive ? 'Pro' : 'Free';
  const today = new Date().toISOString().slice(0, 10);
  const used = (user.queryDate === today) ? (user.queryCount || 0) : 0;
  const queries = user.vipActive
    ? 'Unlimited'
    : `${FREE_LIMIT - used}/${FREE_LIMIT} remaining today`;
  const briefing = user.subscribedBriefing ? 'On' : 'Off';

  await bot.sendMessage(chatId,
    `*Your Status*\n\n` +
    `Plan: *${plan}*\n` +
    `Queries: ${queries}\n` +
    `Daily briefing: ${briefing}`,
    { parse_mode: 'Markdown' },
  );
}
