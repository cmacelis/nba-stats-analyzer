import { getOrCreateUser } from '../services/userService.js';

export async function handleMyStatus(bot, msg) {
  const chatId = msg.chat.id;
  const user = await getOrCreateUser(chatId, msg.from?.username);

  const today = new Date().toISOString().slice(0, 10);
  const isToday = user.queryDate === today;
  const queryCount = isToday ? (user.queryCount || 0) : 0;
  const remaining = user.vipActive ? '∞ (Unlimited)' : Math.max(0, 5 - queryCount);

  let statusMessage = `\u{1F4DD} *Your EdgeDetector Status*\n\n`;

  // Plan status
  if (user.vipActive) {
    statusMessage += `\u2B50 *Plan:* EdgeDetector Pro\n`;
    statusMessage += `\u2705 *Billing:* $19/month (active)\n`;
  } else {
    statusMessage += `\u{1F4B3} *Plan:* Free Tier\n`;
    statusMessage += `\u{1F514} *Upgrade:* /subscribe for unlimited queries\n`;
  }

  // Usage stats
  statusMessage += `\n\u{1F4CA} *Usage Today:*\n`;
  statusMessage += `Queries used: ${queryCount}/5\n`;
  statusMessage += `Remaining: ${remaining}\n`;
  
  if (isToday && queryCount >= 5 && !user.vipActive) {
    statusMessage += `\n\u{1F6A8} *Daily limit reached!*\n`;
    statusMessage += `Use /subscribe to upgrade for unlimited queries.\n`;
  }

  // Features
  statusMessage += `\n\u{1F4C8} *Features:*\n`;
  if (user.vipActive) {
    statusMessage += `✅ Unlimited queries\n`;
    statusMessage += `✅ Daily 9 AM briefing\n`;
    statusMessage += `✅ Priority support\n`;
    statusMessage += `✅ Early access to new features\n`;
  } else {
    statusMessage += `✅ 5 queries/day\n`;
    statusMessage += `✅ All basic commands\n`;
    statusMessage += `❌ Daily briefing\n`;
    statusMessage += `❌ Priority support\n`;
  }

  // Briefing status
  statusMessage += `\n\u{1F4E3} *Daily Briefing:* `;
  if (user.vipActive) {
    statusMessage += user.subscribedBriefing ? 'ON \u2705' : 'OFF \u{1F6AB}';
    if (!user.subscribedBriefing) {
      statusMessage += `\n(Contact support to re-enable)`;
    }
  } else {
    statusMessage += `Pro feature only`;
  }

  // Account info
  statusMessage += `\n\n\u{1F4C5} *Account:*\n`;
  statusMessage += `Joined: ${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recently'}\n`;
  statusMessage += `Username: ${user.username || 'Not set'}\n`;
  statusMessage += `Chat ID: ${chatId}`;

  await bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
}