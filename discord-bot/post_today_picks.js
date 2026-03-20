import { Client, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';
config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', async () => {
  console.log(`🤖 Bot logged in as ${client.user.tag}`);
  
  const channelId = process.env.EDGE_OF_DAY_CHANNEL_ID || '1477498614224916530';
  const channel = await client.channels.fetch(channelId);
  
  if (!channel) {
    console.error(`❌ Channel ${channelId} not found`);
    process.exit(1);
  }
  
  // Today's picks from the generated file
  const picksMessage = `## 🏀 EDGE OF THE DAY — March 19, 2026

### 📊 Current Record: 4-5-0 (44.4%) | Units: -1.36u

---

### 🎯 PICK OF THE DAY
**Collin Sexton (CHI) — OVER 13.5 points** | -102
**Edge Type:** Momentum continuation
- Season avg: 14.6 | Recent avg: 24.0 (+10.5% delta)
- Last 3 games: 30, 20, 22 points
- Prop line significantly undervalued vs recent performance
- **Confidence:** Moderate (1u)

---

### 🥈 RUNNER-UP  
**Quentin Grimes (PHI) — UNDER 22.5 points** | -123
**Edge Type:** Statistical regression  
- Season avg: 13.5 | Recent avg: 11.6 (-10.9% delta)
- Last 5 games: 26, 16, 2, 5, 9 (inconsistent)
- Prop line overvalued vs downward trend
- **Confidence:** Moderate (1u)

---

### 📈 Statistical Backing
- Based on NBA Stats Analyzer edge detection API
- Season vs recent average comparison (5-game window)
- Clear statistical trends identified
- 2-pick maximum for discipline

---

### ⚠️ Risk Management
- Monitor injury reports before game time
- Watch for lineup changes affecting minutes
- No high-confidence picks today (moderate only)

*For entertainment purposes only. Gamble responsibly.*`;

  try {
    await channel.send(picksMessage);
    console.log(`✅ Picks posted to channel #edge-of-the-day`);
  } catch (error) {
    console.error(`❌ Failed to post: ${error.message}`);
  }
  
  // Exit after posting
  setTimeout(() => {
    client.destroy();
    process.exit(0);
  }, 2000);
});

client.login(process.env.DISCORD_TOKEN);