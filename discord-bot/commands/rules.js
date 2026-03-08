import { SlashCommandBuilder } from 'discord.js';

/** Hard timeout for external API calls (10s). */
function withTimeout(promise, ms = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms)),
  ]);
}

export default {
  data: new SlashCommandBuilder()
    .setName('rules')
    .setDescription('List your alert rules'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const userId = interaction.user.id;
    const tag = interaction.user.tag;

    try {
      console.log(`[rules] user=${tag} (${userId})`);

      const response = await withTimeout(
        fetch(`${process.env.API_BASE_URL}/api/alerts/rules?userId=${userId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const result = await response.json();

      if (!response.ok) {
        console.error(`[rules] API error: ${response.status}`, result);
        throw new Error(result.error || 'Failed to fetch alert rules');
      }

      console.log(`[rules] success: ${result.count} rules`);

      if (result.count === 0) {
        await interaction.editReply({
          content: '📭 You have no alert rules set up. Use `/track` to create one.',
        });
        return;
      }

      let message = `📋 **Your Alert Rules (${result.count})**\n\n`;

      result.rules.forEach((rule, index) => {
        const status = rule.enabled ? '🟢' : '🔴';
        const playerInfo = rule.playerName
          ? `**Player:** ${rule.playerName}`
          : rule.playerId
          ? `**Player ID:** ${rule.playerId}`
          : '**Player:** Any';

        const lastTriggered = rule.lastTriggered
          ? `\nLast triggered: <t:${Math.floor(new Date(rule.lastTriggered).getTime() / 1000)}:R>`
          : '';

        message += `${status} **Rule #${index + 1}** (ID: \`${rule.id}\`)\n`;
        message += `${playerInfo}\n`;
        message += `**League:** ${rule.league.toUpperCase()} | **Stat:** ${rule.stat.toUpperCase()}\n`;
        message += `**Direction:** ${rule.direction} | **Min Δ:** ${rule.minDelta} | **Min Min:** ${rule.minMinutes}\n`;
        message += `Created: <t:${Math.floor(new Date(rule.createdAt).getTime() / 1000)}:R>${lastTriggered}\n\n`;
      });

      message += `\n**Commands:**\n`;
      message += `• Use \`/track\` to add a new rule\n`;
      message += `• Use \`/untrack <ruleId>\` to remove a rule\n`;
      message += `• Rules are checked every time alerts run\n`;

      await interaction.editReply({ content: message });

    } catch (error) {
      console.error(`[rules] FAILED user=${tag} (${userId}):`, error.message);
      await interaction.editReply({
        content: `❌ Failed to fetch alert rules: ${error.message}`,
      });
    }
  },
};
