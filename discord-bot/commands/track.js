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
    .setName('track')
    .setDescription('Track a specific edge alert')
    .addStringOption(option =>
      option.setName('league')
        .setDescription('League to track')
        .setRequired(true)
        .addChoices(
          { name: 'NBA', value: 'nba' },
          { name: 'WNBA', value: 'wnba' }
        ))
    .addStringOption(option =>
      option.setName('stat')
        .setDescription('Stat to track')
        .setRequired(true)
        .addChoices(
          { name: 'Points (PTS)', value: 'pts' },
          { name: 'Points+Rebounds+Assists (PRA)', value: 'pra' }
        ))
    .addStringOption(option =>
      option.setName('direction')
        .setDescription('Direction to track')
        .setRequired(true)
        .addChoices(
          { name: 'Over (trending hot)', value: 'over' },
          { name: 'Under (trending cold)', value: 'under' },
          { name: 'Both', value: 'both' }
        ))
    .addNumberOption(option =>
      option.setName('mindelta')
        .setDescription('Minimum delta threshold (e.g., 2.0 for PTS, 3.5 for PRA)')
        .setRequired(true)
        .setMinValue(0.5))
    .addNumberOption(option =>
      option.setName('minminutes')
        .setDescription('Minimum minutes per game filter')
        .setRequired(false)
        .setMinValue(0))
    .addIntegerOption(option =>
      option.setName('playerid')
        .setDescription('Specific player ID (optional)')
        .setRequired(false)
        .setMinValue(1))
    .addStringOption(option =>
      option.setName('playername')
        .setDescription('Player name for display (optional)')
        .setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const userId = interaction.user.id;
    const tag = interaction.user.tag;

    try {
      const league = interaction.options.getString('league');
      const stat = interaction.options.getString('stat');
      const direction = interaction.options.getString('direction');
      const minDelta = interaction.options.getNumber('mindelta');
      const minMinutes = interaction.options.getNumber('minminutes') || 20;
      const playerId = interaction.options.getInteger('playerid');
      const playerName = interaction.options.getString('playername');

      console.log(`[track] user=${tag} (${userId}) league=${league} stat=${stat} dir=${direction} delta=${minDelta} min=${minMinutes}`);

      const ruleData = { userId, league, stat, direction, minDelta, minMinutes };
      if (playerId) ruleData.playerId = playerId;
      if (playerName) ruleData.playerName = playerName;

      const response = await withTimeout(
        fetch(`${process.env.API_BASE_URL}/api/alerts/rules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ruleData),
        })
      );

      const result = await response.json();

      if (!response.ok) {
        console.error(`[track] API error: ${response.status}`, result);
        throw new Error(result.error || 'Failed to create alert rule');
      }

      console.log(`[track] success: ruleId=${result.id}`);

      let message = `✅ **Alert rule created!**\n`;
      message += `**Rule ID:** ${result.id}\n`;
      message += `**League:** ${league.toUpperCase()}\n`;
      message += `**Stat:** ${stat.toUpperCase()}\n`;
      message += `**Direction:** ${direction}\n`;
      message += `**Min Delta:** ${minDelta}\n`;
      message += `**Min Minutes:** ${minMinutes}\n`;

      if (playerId) {
        message += `**Player ID:** ${playerId}\n`;
        if (playerName) message += `**Player:** ${playerName}\n`;
      } else {
        message += `**Player:** Any player\n`;
      }

      message += `\nYou'll receive a DM when a player matches this rule.`;

      await interaction.editReply({ content: message });

    } catch (error) {
      console.error(`[track] FAILED user=${tag} (${userId}):`, error.message);
      await interaction.editReply({
        content: `❌ Failed to create alert rule: ${error.message}`,
      });
    }
  },
};
