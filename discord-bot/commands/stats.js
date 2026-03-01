import {
  SlashCommandBuilder,
  EmbedBuilder,
  Colors,
} from 'discord.js';
import axios from 'axios';

const API_BASE = process.env.NBA_API_BASE || 'http://localhost:3000';

export default {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Get season stats for a player')
    .addStringOption(option =>
      option
        .setName('player')
        .setDescription('Player name (e.g., LeBron James)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const playerName = interaction.options.getString('player');

    try {
      console.log(`   Fetching stats: ${playerName}`);

      // Reply IMMEDIATELY to acknowledge
      await interaction.reply({
        content: '📈 Loading...',
        ephemeral: false,
      });

      // Get research data (includes stat context)
      const response = await axios.get(`${API_BASE}/api/research/${encodeURIComponent(playerName)}`, {
        timeout: 5000,
      });

      const data = response.data;
      if (!data.playerName) {
        throw new Error(`Player "${playerName}" not found`);
      }

      // Extract available stats from research report
      const statContext = data.statContext || {};
      const ppg = statContext.ppg ?? statContext.PPG ?? 'N/A';
      const apg = statContext.apg ?? statContext.APG ?? 'N/A';
      const rpg = statContext.rpg ?? statContext.RPG ?? 'N/A';

      const embed = new EmbedBuilder()
        .setColor(Colors.Blue)
        .setTitle(`📈 ${data.playerName} - Stats & Analysis`)
        .addFields(
          {
            name: '🏀 Season Averages',
            value: `**PPG:** ${typeof ppg === 'number' ? ppg.toFixed(1) : ppg}\n**APG:** ${typeof apg === 'number' ? apg.toFixed(1) : apg}\n**RPG:** ${typeof rpg === 'number' ? rpg.toFixed(1) : rpg}`,
            inline: false,
          },
          {
            name: '📊 Current Analysis',
            value: `**Prediction:** ${data.prediction?.toUpperCase() || 'N/A'}\n**Confidence:** ${((data.confidence || 0) * 100).toFixed(0)}%\n**Reasoning:** ${data.reasoning || 'N/A'}`,
            inline: false,
          },
          {
            name: '⚖️ Weight Breakdown',
            value: `Sentiment: ${data.sentimentWeight || 'N/A'}\nStats: ${data.statWeight || 'N/A'}`,
            inline: true,
          }
        )
        .setFooter({ text: `NBA Stats Analyzer • Phase 2 ${data.simulated ? '(Simulated Data)' : '(Real Data)'}` })
        .setTimestamp();

      await interaction.editReply({ content: '', embeds: [embed] });
      console.log(`   ✓ Stats sent: ${data.playerName}`);
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);

      let errorMessage = '❌ Backend offline';
      if (error.response?.status === 404) {
        errorMessage = `❌ Player not found`;
      } else if (error.message.includes('timeout')) {
        errorMessage = '❌ Request timed out';
      }

      try {
        await interaction.editReply({ content: errorMessage });
      } catch (replyError) {
        console.error('   Failed to edit reply:', replyError.message);
      }
    }
  },
};
