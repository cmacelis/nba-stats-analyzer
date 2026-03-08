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
    .setName('untrack')
    .setDescription('Remove an alert rule')
    .addStringOption(option =>
      option.setName('ruleid')
        .setDescription('Rule ID to remove (get from /rules)')
        .setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const userId = interaction.user.id;
    const tag = interaction.user.tag;

    try {
      const ruleId = interaction.options.getString('ruleid');

      console.log(`[untrack] user=${tag} (${userId}) ruleId=${ruleId}`);

      const response = await withTimeout(
        fetch(`${process.env.API_BASE_URL}/api/alerts/rules`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ruleId, userId }),
        })
      );

      const result = await response.json();

      if (!response.ok) {
        console.error(`[untrack] API error: ${response.status}`, result);
        throw new Error(result.error || 'Failed to delete alert rule');
      }

      console.log(`[untrack] success: ruleId=${ruleId}`);

      await interaction.editReply({
        content: `✅ **Alert rule deleted!**\nRule ID: \`${ruleId}\` has been removed.`,
      });

    } catch (error) {
      console.error(`[untrack] FAILED user=${tag} (${userId}):`, error.message);
      await interaction.editReply({
        content: `❌ Failed to delete alert rule: ${error.message}`,
      });
    }
  },
};
