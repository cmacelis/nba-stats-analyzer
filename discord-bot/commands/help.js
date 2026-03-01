import {
  SlashCommandBuilder,
  EmbedBuilder,
  Colors,
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(Colors.Blurple)
      .setTitle('🤖 NBA Stats Analyzer - Commands')
      .setDescription('Get NBA player stats, predictions, and sentiment analysis')
      .addFields(
        {
          name: '/predict',
          value: 'Get ML prediction for a player stat (points/assists/rebounds)\n**Usage:** `/predict player:"LeBron James" stat_type:points`',
          inline: false,
        },
        {
          name: '/sentiment',
          value: 'Get sentiment analysis for a player across Reddit, ESPN, and Twitter\n**Usage:** `/sentiment player:"LeBron James"`',
          inline: false,
        },
        {
          name: '/stats',
          value: 'Get season stats (PPG, APG, RPG) and last 5 games for a player\n**Usage:** `/stats player:"LeBron James"`',
          inline: false,
        },
        {
          name: '/help',
          value: 'Show this help message',
          inline: false,
        }
      )
      .addFields(
        {
          name: '⚙️ Rate Limiting',
          value: 'Max 1 request per user every 2 seconds to prevent abuse',
          inline: false,
        },
        {
          name: '📝 Notes',
          value: 'If the backend is offline, you\'ll see an error message. Make sure the backend server is running on `http://localhost:3000`',
          inline: false,
        }
      )
      .setFooter({ text: 'NBA Stats Analyzer • Phase 2 MVP' })
      .setTimestamp();

    console.log(`   ✓ Help displayed`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
