import { SlashCommandBuilder } from 'discord.js';
import { checkRateLimit } from '../index.js';

export default {
  data: new SlashCommandBuilder()
    .setName('untrack')
    .setDescription('Remove an alert rule')
    .addStringOption(option =>
      option.setName('ruleid')
        .setDescription('Rule ID to remove (get from /rules)')
        .setRequired(true)),

  async execute(interaction) {
    // Rate limit check
    if (!checkRateLimit(interaction.user.id)) {
      return interaction.reply({
        content: '⏳ Please wait a moment before using another command.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const ruleId = interaction.options.getString('ruleid');

      // Call the API
      const response = await fetch(`${process.env.API_BASE_URL}/api/alerts/rules/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ruleId,
          userId: interaction.user.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete alert rule');
      }

      await interaction.editReply({
        content: `✅ **Alert rule deleted!**\nRule ID: \`${ruleId}\` has been removed.`,
      });

    } catch (error) {
      console.error('[untrack command] error:', error);
      await interaction.editReply({
        content: `❌ Failed to delete alert rule: ${error.message}`,
      });
    }
  },
};