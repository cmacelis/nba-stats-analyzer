export async function handleHelp(bot, msg) {
  await bot.sendMessage(msg.chat.id,
    `*EdgeDetector.ai — Commands*\n\n` +
    `*Natural Language (just type):*\n` +
    `\`LeBron over 25.5 points\`\n` +
    `\`Jokic under 10.5 rebounds\`\n` +
    `\`Curry over 4.5 threes\`\n\n` +
    `*Slash Commands:*\n` +
    `/player <name> [stat] — Season stats & prediction\n` +
    `/prop <name> <stat> — Prop analysis\n` +
    `/edges — Today's top 5 edges\n` +
    `/subscribe — Upgrade to Pro ($19/mo)\n` +
    `/mystatus — Your plan & usage\n` +
    `/help — This message\n\n` +
    `*Supported Stats:*\n` +
    `points, assists, rebounds, steals, blocks, turnovers\n` +
    `fg%, 3p%, ft%\n` +
    `Example: \`/player LeBron James rebounds\`\n\n` +
    `*Free:* 5 queries/day\n` +
    `*Pro ($19/mo):* Unlimited + daily 9 AM briefing\n`,
    { parse_mode: 'Markdown' },
  );
}
