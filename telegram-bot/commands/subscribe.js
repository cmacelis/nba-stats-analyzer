import { getOrCreateUser } from '../services/userService.js';

export async function handleSubscribe(bot, msg) {
  const chatId = msg.chat.id;
  const user = await getOrCreateUser(chatId, msg.from?.username);

  if (user.vipActive) {
    const briefing = user.subscribedBriefing ? 'On' : 'Off';
    return bot.sendMessage(chatId,
      `\u2B50 *You're on Pro*\n\n` +
      `Unlimited queries\n` +
      `Daily briefing: ${briefing}`,
      { parse_mode: 'Markdown' },
    );
  }

  const baseUrl = process.env.STRIPE_CHECKOUT_URL || 'https://edgedetector.ai/pricing';
  const checkoutUrl = `${baseUrl}?ref=tg_${chatId}`;

  await bot.sendMessage(chatId,
    `*EdgeDetector Pro* \u2014 $19/month\n\n` +
    `\u2705 Unlimited prop queries\n` +
    `\u2705 Daily 9 AM edge briefing\n\n` +
    `Tap below to subscribe:`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: 'Subscribe $19/mo', url: checkoutUrl },
        ]],
      },
    },
  );
}
