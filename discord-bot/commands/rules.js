import { SlashCommandBuilder } from 'discord.js';
import { checkRateLimit } from '../index.js';

export default {
  data: new SlashCommandBuilder()
    .setName('rules')
    .setDescription('List your alert rules'),

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
      // Call the API
      const response = await fetch(
        `${process.env.API_BASE_URL}/api/alerts/rules/list?userId=${interaction.user.id}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch alert rules');
      }

      if (result.count === 0) {
        await interaction.editReply({
          content: '📭 You have no alert rules set up. Use `/track` to create one.',
        });
        return;
      }

      // Build formatted list
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

      // Add instructions
      message += `\n**Commands:**\n`;
      message += `• Use \`/track\` to add a new rule\n`;
      message += `• Use \`/untrack <ruleId>\` to remove a rule\n`;
      message += `• Rules are checked every time alerts run\n`;

      await interaction.editReply({ content: message });

    } catch (error) {
      console.error('[rules command] error:', error);
      await interaction.editReply({
        content: `❌ Failed to fetch alert rules: ${error.message}`,
      });
    }
  },
};