export async function handleSubscribe(bot, msg) {
  const chatId = msg.chat.id;
  const baseUrl = process.env.STRIPE_CHECKOUT_URL || 'https://edgedetector.ai/pricing';
  const checkoutUrl = `${baseUrl}?ref=tg_${chatId}`;

  await bot.sendMessage(chatId,
    `*EdgeDetector Pro* \u2014 $19/month\n\n` +
    `\u2705 Unlimited prop queries\n` +
    `\u2705 Daily 9 AM edge briefing\n` +
    `\u2705 Real-time line movement alerts\n` +
    `\u2705 Priority support\n\n` +
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
