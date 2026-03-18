import {
  SlashCommandBuilder,
  EmbedBuilder,
  Colors,
} from 'discord.js';
import axios from 'axios';

const API_BASE = process.env.NBA_API_BASE || 'http://localhost:3000';

export default {
  data: new SlashCommandBuilder()
    .setName('sentiment')
    .setDescription('Get sentiment analysis for a player')
    .addStringOption(option =>
      option
        .setName('player')
        .setDescription('Player name (e.g., LeBron James)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const playerName = interaction.options.getString('player');

    try {
      console.log(`   Fetching sentiment: ${playerName}`);

      // Reply immediately
      await interaction.reply({
        content: '💭 Analyzing...',
        ephemeral: false,
      });

      // Then fetch data
      const response = await axios.get(`${API_BASE}/api/research/${encodeURIComponent(playerName)}`, {
        timeout: 5000,
      });

      const data = response.data;

      // Validate response structure
      if (!data.playerName) {
        throw new Error('Invalid API response format');
      }

      // Extract sentiment from report (Phase 2 doesn't have separate sentiment field yet)
      // Using reasoning and prediction as proxy for sentiment
      const predictionToSentiment = {
        'over': 0.5,
        'under': -0.5,
        'neutral': 0
      };
      const overallSentiment = predictionToSentiment[data.prediction?.toLowerCase()] || 0;

      // Sentiment color mapping based on prediction
      let color = Colors.Grey;
      let sentimentLabel = '😐 Neutral';
      if (data.prediction?.toLowerCase() === 'over') {
        color = Colors.Green;
        sentimentLabel = '😊 Positive (Predicted OVER)';
      } else if (data.prediction?.toLowerCase() === 'under') {
        color = Colors.Red;
        sentimentLabel = '😠 Negative (Predicted UNDER)';
      }

      // Sentiment bar
      const barLength = 20;
      const sentimentPercent = Math.round((overallSentiment + 1) / 2 * 100);
      const filledLength = Math.round(barLength * sentimentPercent / 100);
      const sentimentBar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

      const formatSentimentValue = (val) => {
        const formatted = val.toFixed(2);
        return val > 0 ? `+${formatted}` : formatted;
      };

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`💭 ${data.playerName} - Sentiment Analysis`)
        .addFields(
          {
            name: '📊 Overall Sentiment',
            value: `${sentimentLabel}\n${sentimentBar}\n**${formatSentimentValue(overallSentiment)}**`,
            inline: false,
          },
          {
            name: '📝 Analysis',
            value: data.reasoning || 'Analyzing player social sentiment...',
            inline: false,
          },
          {
            name: '⚖️ Weights',
            value: `Sentiment: ${data.sentimentWeight || 'N/A'} | Stats: ${data.statWeight || 'N/A'}`,
            inline: true,
          }
        )
        .setFooter({ text: `NBA Stats Analyzer • Phase 2 ${data.simulated ? '(Simulated Data)' : ''}` })
        .setTimestamp();

      await interaction.editReply({ content: '', embeds: [embed] });
      console.log(`   ✓ Sentiment sent: ${data.playerName}`);
      
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
