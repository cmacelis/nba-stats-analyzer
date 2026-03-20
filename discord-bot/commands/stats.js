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
    )
    .addStringOption(option =>
      option
        .setName('stat_type')
        .setDescription('Type of stat to display (default: all)')
        .setRequired(false)
        .addChoices(
          { name: 'All Stats', value: 'all' },
          { name: 'Points (PPG)', value: 'points' },
          { name: 'Assists (APG)', value: 'assists' },
          { name: 'Rebounds (RPG)', value: 'rebounds' },
          { name: 'Steals (SPG)', value: 'steals' },
          { name: 'Blocks (BPG)', value: 'blocks' },
          { name: 'Turnovers (TOV)', value: 'turnovers' },
          { name: 'Field Goal %', value: 'fg_pct' },
          { name: 'Three Point %', value: 'three_pct' },
          { name: 'Free Throw %', value: 'ft_pct' }
        )
    ),

  async execute(interaction) {
    const playerName = interaction.options.getString('player');
    const statType = interaction.options.getString('stat_type') || 'all';

    try {
      console.log(`   Fetching stats: ${playerName}`);

      // Reply IMMEDIATELY to acknowledge
      await interaction.reply({
        content: '📈 Loading...',
        ephemeral: false,
      });

      // Get research data (includes stat context)
      const response = await axios.get(`${API_BASE}/api/research/${encodeURIComponent(playerName)}`, {
        params: { prop: statType === 'all' ? 'points' : statType },
        timeout: 25000,
      });

      const data = response.data;
      if (!data.playerName) {
        throw new Error(`Player "${playerName}" not found`);
      }

      // Extract available stats from research report
      const statContext = data.statContext || {};
      
      // Map stat names to their values
      const statMap = {
        points: statContext.ppg ?? statContext.PPG ?? 'N/A',
        assists: statContext.apg ?? statContext.APG ?? 'N/A',
        rebounds: statContext.rpg ?? statContext.RPG ?? 'N/A',
        steals: statContext.spg ?? statContext.SPG ?? 'N/A',
        blocks: statContext.bpg ?? statContext.BPG ?? 'N/A',
        turnovers: statContext.tov ?? statContext.TOV ?? 'N/A',
        fg_pct: statContext.fg_pct ?? statContext.FG_PCT ?? 'N/A',
        three_pct: statContext.three_pct ?? statContext.THREE_PCT ?? 'N/A',
        ft_pct: statContext.ft_pct ?? statContext.FT_PCT ?? 'N/A'
      };

      // Format stat value
      const formatStat = (value, statKey) => {
        if (typeof value === 'number') {
          // Percentage stats
          if (statKey.includes('_pct') || statKey === 'fg_pct' || statKey === 'three_pct' || statKey === 'ft_pct') {
            return (value * 100).toFixed(1) + '%';
          }
          // Decimal stats (per game averages)
          return value.toFixed(1);
        }
        return value;
      };

      // Build stat display based on selected type
      let statDisplay = '';
      if (statType === 'all') {
        // Show all available stats
        statDisplay = Object.entries(statMap)
          .filter(([_, value]) => value !== 'N/A')
          .map(([key, value]) => {
            const statName = key.charAt(0).toUpperCase() + key.slice(1);
            return `**${statName}:** ${formatStat(value, key)}`;
          })
          .join('\n');
        
        if (!statDisplay) {
          statDisplay = '**PPG:** N/A\n**APG:** N/A\n**RPG:** N/A';
        }
      } else {
        // Show specific stat
        const statValue = statMap[statType] || 'N/A';
        const statName = statType.charAt(0).toUpperCase() + statType.slice(1);
        statDisplay = `**${statName}:** ${formatStat(statValue, statType)}`;
      }

      const embed = new EmbedBuilder()
        .setColor(Colors.Blue)
        .setTitle(`📈 ${data.playerName} - ${statType === 'all' ? 'All Stats' : statType.charAt(0).toUpperCase() + statType.slice(1)}`)
        .addFields(
          {
            name: '🏀 Season Averages',
            value: statDisplay,
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
