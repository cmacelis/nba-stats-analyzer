import {
  SlashCommandBuilder,
  EmbedBuilder,
  Colors,
} from 'discord.js';
import axios from 'axios';

const API_BASE = process.env.NBA_API_BASE || 'http://localhost:3000';

export default {
  data: new SlashCommandBuilder()
    .setName('predict')
    .setDescription('Get ML prediction for a player stat')
    .addStringOption(option =>
      option
        .setName('player')
        .setDescription('Player name (e.g., LeBron James)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('stat_type')
        .setDescription('Stat type to predict')
        .setRequired(true)
        .addChoices(
          { name: 'Points', value: 'points' },
          { name: 'Assists', value: 'assists' },
          { name: 'Rebounds', value: 'rebounds' }
        )
    ),

  async execute(interaction) {
    const playerName = interaction.options.getString('player');
    const statType = interaction.options.getString('stat_type');

    await interaction.deferReply();

    try {
      const response = await axios.get(`${API_BASE}/api/research/${encodeURIComponent(playerName)}`, {
        params: { prop: statType },
        timeout: 5000,
      });

      const data = response.data;

      // Validate response structure
      if (!data.playerName || data.prediction === undefined) {
        throw new Error('Invalid API response format');
      }

      // Normalize prediction to OVER/UNDER
      const predictionText = data.prediction.toUpperCase() === 'OVER' ? 'OVER' : 
                             data.prediction.toUpperCase() === 'UNDER' ? 'UNDER' : 
                             String(data.prediction).toUpperCase();
      const color = predictionText === 'OVER' ? Colors.Green : Colors.Red;
      const confidence = ((data.confidence || 0.5) * 100).toFixed(0);

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`📊 ${data.playerName} - ${data.propType.charAt(0).toUpperCase() + data.propType.slice(1)} Prediction`)
        .addFields(
          {
            name: '🎯 Prediction',
            value: `**${predictionText}**`,
            inline: true,
          },
          {
            name: '💯 Confidence',
            value: `${confidence}%`,
            inline: true,
          },
          {
            name: '📝 Reasoning',
            value: data.reasoning || 'N/A',
            inline: false,
          },
          {
            name: '⚖️ Weights',
            value: `${data.statWeight || 'N/A'} | ${data.sentimentWeight || 'N/A'}`,
            inline: true,
          }
        )
        .setFooter({ text: `NBA Stats Analyzer • Phase 2 ${data.simulated ? '(Simulated Data)' : ''}` })
        .setTimestamp();

      console.log(`   ✓ Prediction fetched: ${data.playerName} ${data.propType} → ${predictionText} (${confidence}%)`);
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(`   ❌ API Error: ${error.message}`);

      let errorMessage = '❌ Backend offline';
      if (error.response?.status === 404) {
        errorMessage = `❌ Player "${playerName}" not found`;
      } else if (error.message.includes('timeout')) {
        errorMessage = '❌ Request timed out';
      }

      const errorEmbed = new EmbedBuilder()
        .setColor(Colors.Red)
        .setTitle('Error')
        .setDescription(errorMessage)
        .setFooter({ text: 'NBA Stats Analyzer • Phase 2' });

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
