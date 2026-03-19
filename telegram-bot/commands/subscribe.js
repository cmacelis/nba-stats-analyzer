import { getOrCreateUser, isVip } from '../services/userService.js';

export async function handleSubscribe(bot, msg) {
  const chatId = msg.chat.id;
  const user = await getOrCreateUser(chatId, msg.from?.username);

  // Check if user is already VIP
  if (user.vipActive) {
    const briefing = user.subscribedBriefing ? 'On' : 'Off';
    return bot.sendMessage(chatId,
      `\u2B50 *You're already on EdgeDetector Pro!*\n\n` +
      `✅ Unlimited prop queries\n` +
      `✅ Daily 9 AM edge briefing: ${briefing}\n` +
      `✅ Priority support\n\n` +
      `*No need to subscribe again.*\n` +
      `Your subscription is active and billed monthly.\n\n` +
      `Need help? Contact support@edgedetector.ai`,
      { parse_mode: 'Markdown' },
    );
  }

  // Check for potential duplicate subscription attempt
  // (User might have subscribed through website but vipActive not updated yet)
  const baseUrl = process.env.STRIPE_CHECKOUT_URL || 'https://edgedetector.ai/pricing';
  const checkoutUrl = `${baseUrl}?ref=tg_${chatId}`;

  await bot.sendMessage(chatId,
    `*EdgeDetector Pro* \u2014 $19/month\n\n` +
    `✅ Unlimited prop queries (5/day free)\n` +
    `✅ Daily 9 AM edge briefing\n` +
    `✅ Priority support & early features\n\n` +
    `*Already subscribed through the website?*\n` +
    `Your VIP status should activate within 5 minutes.\n` +
    `If it doesn't, contact support@edgedetector.ai\n\n` +
    `Tap below to subscribe:`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: 'Subscribe $19/month', url: checkoutUrl },
        ]],
      },
    },
  );
}
