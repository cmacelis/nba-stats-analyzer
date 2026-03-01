# NBA Stats Analyzer Discord Bot

Discord bot for Phase 2 NBA Stats Analyzer. Provides ML predictions, sentiment analysis, and player stats directly from Discord.

## Features

✅ **4 Slash Commands**
- `/help` — List all available commands
- `/predict [player] [stat_type]` — Get OVER/UNDER prediction + confidence
- `/sentiment [player]` — Analyze social sentiment (Reddit, ESPN, Twitter)
- `/stats [player]` — Display season stats + current analysis

✅ **Real-Time Data**
- Connected to EllaMac backend (192.168.10.101:3000)
- Sub-500ms response times
- Simulated data for testing (when API unavailable)

✅ **Production Ready**
- Rate limiting (1 req/user/2 sec)
- Error handling + graceful fallbacks
- Auto-reconnect on disconnect
- Clean Discord embeds with color coding

## Installation

### Prerequisites
- Node.js 18+
- Discord bot token
- NBA Stats Analyzer backend running

### Setup

1. **Clone repo:**
```bash
cd /Users/ellis/.openclaw/workspace/nba-analyzer/discord-bot
npm install
```

2. **Create `.env` file:**
```
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id
GUILD_ID=1475350412331581502
NBA_API_BASE=http://192.168.10.101:3000
```

3. **Start bot:**
```bash
./start.sh
# OR
node index.js
```

## Usage

### Commands

#### /help
Shows all available commands.

#### /predict [player] [stat_type]
Get ML prediction for a player's stat.

**Parameters:**
- `player` (required): Player name (e.g., "Luka Doncic")
- `stat_type` (required): points, assists, or rebounds

**Response:**
- Prediction: OVER or UNDER
- Confidence: 0-100%
- Reasoning: Why the prediction was made
- Weights: Sentiment vs Stats influence

**Example:**
```
/predict Luka Doncic points
```

#### /sentiment [player]
Analyze sentiment from social sources.

**Parameters:**
- `player` (required): Player name

**Response:**
- Overall sentiment: -1 (Negative) to +1 (Positive)
- Sentiment bar visualization
- Analysis text from backend
- Weight breakdown

**Example:**
```
/sentiment LeBron James
```

#### /stats [player]
Display season stats + current analysis.

**Parameters:**
- `player` (required): Player name

**Response:**
- Season averages: PPG, APG, RPG
- Current prediction & confidence
- Reasoning
- Weight breakdown

**Example:**
```
/stats Giannis Antetokounmpo
```

## Deployment

### Quick Start (Manual)
```bash
./start.sh
```

### Persistent (macOS LaunchAgent)
```bash
launchctl load ~/Library/LaunchAgents/com.discord-bot.nba.plist
```

### Check Status
```bash
launchctl list | grep discord-bot
```

### View Logs
```bash
tail -f /tmp/discord-bot.log
```

### Restart
```bash
launchctl stop com.discord-bot.nba
launchctl start com.discord-bot.nba
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full guide.

## Architecture

### Command Structure
```
commands/
├── help.js          (Lists all commands)
├── predict.js       (ML prediction)
├── sentiment.js     (Social sentiment)
└── stats.js         (Player stats)

index.js             (Bot core, command loader, event handler)
```

### Response Flow
1. User invokes slash command
2. Bot replies immediately with placeholder message
3. Bot fetches data from backend API
4. Bot edits reply with final embed

This "reply-first" pattern ensures Discord doesn't timeout the interaction.

### API Integration
- **Endpoint:** `GET /api/research/:playerName?prop=[points|assists|rebounds]`
- **Timeout:** 5 seconds
- **Response:** Prediction, confidence, sentiment, weights

## Error Handling

**Backend offline?** → Shows "❌ Backend offline"

**Player not found?** → Shows "❌ Player not found"

**Request timeout?** → Shows "❌ Request timed out"

**Unknown error?** → Shows error message + logs details

## Performance

- **Startup:** ~3 seconds
- **Response time:** 200-500ms per command
- **Memory:** ~100 MB
- **CPU:** Minimal (event-driven)

## Configuration

### .env File
```
DISCORD_TOKEN=...      # Bot token from Discord Developer Portal
CLIENT_ID=...          # Bot application ID
GUILD_ID=...           # Discord guild/server ID
NBA_API_BASE=...       # Backend URL (default: http://192.168.10.101:3000)
```

### Rate Limiting
Currently set to 1 request per user per 2 seconds. Edit `index.js`:
```javascript
const RATE_LIMIT_WINDOW = 2000; // milliseconds
```

### API Timeout
Currently set to 5 seconds. Edit each command file:
```javascript
timeout: 5000,  // milliseconds
```

## Monitoring

Check if bot is running:
```bash
ps aux | grep "node index.js" | grep -v grep
```

Check backend connectivity:
```bash
curl http://192.168.10.101:3000/api/research/Test
```

## Troubleshooting

**Bot not responding to commands?**
1. Check logs: `tail -f /tmp/discord-bot.log`
2. Verify bot is in server and has permissions
3. Ensure guild ID is correct in `.env`

**Commands not showing up?**
1. Restart bot: `launchctl stop/start com.discord-bot.nba`
2. Check that guild ID matches your Discord server

**API timeouts?**
1. Verify backend is running: `curl http://192.168.10.101:3000/api/research/Test`
2. Check network connectivity to EllaMac (192.168.10.101)
3. Increase timeout in command files if needed

**Memory leaks or crashes?**
1. Check error logs: `tail -f /tmp/discord-bot-stderr.log`
2. Ensure enough disk space for logs
3. Consider rotating logs if they get too large

## Development

### Adding a New Command

1. Create `commands/my-command.js`:
```javascript
import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('mycommand')
    .setDescription('Description here'),

  async execute(interaction) {
    await interaction.reply({ content: 'Response here' });
  }
};
```

2. Bot auto-loads from `commands/` directory
3. Test in Discord, then commit & push

### Debugging

Enable verbose logging by editing `index.js`:
```javascript
console.log('DEBUG: ' + message); // Add to handlers
```

## Support

- **Logs:** `/tmp/discord-bot.log`
- **Deployment:** See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Backend:** [NBA Stats Analyzer Backend](../backend/)
- **GitHub:** https://github.com/cmacelis/nba-stats-analyzer

## License

Part of NBA Stats Analyzer project. See root LICENSE.

---

**Status:** Production Ready ✅  
**Last Updated:** March 1, 2026  
**Maintainer:** Ellis
