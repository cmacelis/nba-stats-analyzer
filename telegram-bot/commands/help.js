export async function handleHelp(bot, msg) {
  await bot.sendMessage(msg.chat.id,
    `*EdgeDetector.ai \u2014 Commands*\n\n` +
    `*Natural Language (just type):*\n` +
    `\`LeBron over 25.5 points\`\n` +
    `\`Jokic under 10.5 rebounds\`\n` +
    `\`Curry over 4.5 threes\`\n\n` +
    `*Slash Commands:*\n` +
    `/player <name> \u2014 Season stats & prediction\n` +
    `/prop <name> <stat> \u2014 Prop analysis (e.g. /prop LeBron points)\n` +
    `/edges \u2014 Today's top 5 statistical edges\n` +
    `/subscribe \u2014 Upgrade to Pro ($19/mo)\n` +
    `/help \u2014 This message\n\n` +
    `*Supported Stats:*\n` +
    `points, rebounds, assists, threes, pra (combined)\n\n` +
    `*Free:* 5 queries/day\n` +
    `*Pro ($19/mo):* Unlimited queries + daily 9 AM briefing + real-time alerts`,
    { parse_mode: 'Markdown' },
  );
}
