/**
 * Function to send personalized alerts to Discord users.
 * This should be called from the alerts/run-enhanced endpoint.
 */

import { Client, GatewayIntentBits } from 'discord.js';

let discordClient = null;

/**
 * Initialize Discord client for sending DMs.
 */
export async function initDiscordClient() {
  if (discordClient) return discordClient;

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.warn('[Personal Alerts] DISCORD_BOT_TOKEN not set. Personal alerts disabled.');
    return null;
  }

  discordClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
  });

  try {
    await discordClient.login(token);
    console.log('[Personal Alerts] Discord client logged in');
    return discordClient;
  } catch (error) {
    console.error('[Personal Alerts] Failed to login:', error);
    discordClient = null;
    return null;
  }
}

/**
 * Send a personalized alert to a Discord user.
 */
export async function sendPersonalAlert(userId, alertData) {
  try {
    const client = await initDiscordClient();
    if (!client) {
      console.warn(`[Personal Alerts] Discord client not available. Would send to ${userId}:`, alertData);
      return false;
    }

    // Fetch the user
    const user = await client.users.fetch(userId);
    if (!user) {
      console.error(`[Personal Alerts] User ${userId} not found`);
      return false;
    }

    // Send DM
    const message = {
      content: `🔔 **Personal Alert Triggered!**\n\n` +
               `Your rule for **${alertData.ruleDescription}** matched:\n` +
               `**Player:** ${alertData.playerName} (${alertData.team})\n` +
               `**Δ ${alertData.stat.toUpperCase()}:** ${alertData.delta >= 0 ? '+' : ''}${alertData.delta.toFixed(1)}\n` +
               `**Season Avg:** ${alertData.seasonAvg.toFixed(1)} | **L5 Avg:** ${alertData.recentAvg.toFixed(1)}\n\n` +
               `View all edges: ${alertData.edgeFeedUrl || 'https://edgedetector.ai/edge'}\n` +
               `Use \`/rules\` to manage your alert rules.`,
      embeds: alertData.embed ? [alertData.embed] : [],
    };

    await user.send(message);
    console.log(`[Personal Alerts] Sent alert to ${user.tag} (${userId})`);
    return true;
  } catch (error) {
    console.error(`[Personal Alerts] Failed to send alert to ${userId}:`, error.message);
    
    // Check if it's a DM permission error
    if (error.code === 50007) { // Cannot send messages to this user
      console.log(`[Personal Alerts] User ${userId} has DMs disabled`);
    }
    
    return false;
  }
}

/**
 * Format alert data for Discord.
 */
export function formatAlertData(match, stat, edgeFeedUrl) {
  const { entry, rule } = match;
  const isOver = entry.delta >= 0;
  const sign = isOver ? '+' : '';
  
  return {
    userId: rule.userId,
    playerName: entry.player_name,
    team: entry.team_abbrev,
    stat,
    delta: entry.delta,
    seasonAvg: entry.season_avg,
    recentAvg: entry.recent_avg,
    ruleDescription: `${rule.direction} ${stat.toUpperCase()} ≥ ${rule.minDelta}`,
    edgeFeedUrl,
    embed: {
      title: `🔔 ${entry.player_name} (${entry.team_abbrev})`,
      color: isOver ? 0x22c55e : 0x3b82f6,
      description: `**${sign}${entry.delta.toFixed(1)}** vs season average (L5 trending ${isOver ? 'hot' : 'cold'})`,
      fields: [
        { name: 'Season Avg', value: entry.season_avg.toFixed(1), inline: true },
        { name: 'L5 Avg', value: entry.recent_avg.toFixed(1), inline: true },
        { name: 'Δ', value: `${sign}${entry.delta.toFixed(1)}`, inline: true },
        { name: 'Your Rule', value: `${rule.direction} ${stat.toUpperCase()} ≥ ${rule.minDelta}`, inline: true },
        { name: 'League', value: rule.league.toUpperCase(), inline: true },
        { name: 'Min Minutes', value: `${rule.minMinutes}`, inline: true },
      ],
      footer: { text: 'Edge Detector Personal Alert' },
      timestamp: new Date().toISOString(),
    },
  };
}