# Discord Bot Deployment Guide

## Quick Start

### Manual Start (One-Off)
```bash
cd /Users/ellis/.openclaw/workspace/nba-analyzer/discord-bot
./start.sh
```

Check status:
```bash
ps aux | grep "node index.js" | grep -v grep
```

Check logs:
```bash
tail -f bot.log
```

Stop:
```bash
pkill -f "node index.js"
```

---

## Persistent Deployment (Always-On)

### Option 1: macOS LaunchAgent (Recommended)

Create the LaunchAgent plist:
```bash
mkdir -p ~/Library/LaunchAgents
```

Create `~/Library/LaunchAgents/com.discord-bot.nba.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.discord-bot.nba</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>cd /Users/ellis/.openclaw/workspace/nba-analyzer/discord-bot && node index.js >> /tmp/discord-bot.log 2>&1</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/discord-bot-stdout.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/discord-bot-stderr.log</string>
    <key>WorkingDirectory</key>
    <string>/Users/ellis/.openclaw/workspace/nba-analyzer/discord-bot</string>
</dict>
</plist>
```

Load the agent:
```bash
launchctl load ~/Library/LaunchAgents/com.discord-bot.nba.plist
```

Check status:
```bash
launchctl list | grep discord-bot
```

View logs:
```bash
tail -f /tmp/discord-bot.log
```

Restart:
```bash
launchctl stop com.discord-bot.nba
launchctl start com.discord-bot.nba
```

Unload (stop permanently):
```bash
launchctl unload ~/Library/LaunchAgents/com.discord-bot.nba.plist
```

---

### Option 2: EllaMac (Always-On Server)

If running on EllaMac (192.168.10.101):

```bash
ssh ellamac@192.168.10.101
cd /Users/ellamac/discord-bot
./start.sh
```

Set up LaunchAgent on EllaMac same as above (adjust paths).

---

## Configuration

### Environment Variables

The bot reads from `.env`:
```
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_client_id
GUILD_ID=1475350412331581502
NBA_API_BASE=http://192.168.10.101:3000
```

**Important:** Never commit `.env` to Git. It's in `.gitignore`.

---

## Monitoring

### Health Check Script

Create `monitor-bot.sh`:
```bash
#!/bin/bash
echo "🔍 Discord Bot Status"

if ps aux | grep -v grep | grep "node index.js" > /dev/null; then
    echo "✅ Bot is running"
else
    echo "❌ Bot is NOT running"
    exit 1
fi

# Check if responding
curl -s http://192.168.10.101:3000/api/research/Test > /dev/null && \
    echo "✅ Backend API responding" || \
    echo "❌ Backend API offline"
```

Make executable:
```bash
chmod +x monitor-bot.sh
```

Run periodically via cron:
```bash
0 */2 * * * /Users/ellis/.openclaw/workspace/nba-analyzer/discord-bot/monitor-bot.sh >> /tmp/bot-monitor.log 2>&1
```

---

## Troubleshooting

### Bot dies silently
- Check `/tmp/discord-bot.log` for errors
- Ensure `.env` file exists with valid token
- Verify backend is reachable: `curl http://192.168.10.101:3000/api/research/Test`

### Commands not registering
- Check logs: `tail -f bot.log`
- Guild ID might be wrong (verify in Discord)
- Bot might not have permissions in server (check server settings)

### Discord says "The application did not respond"
- This was fixed by using reply-first pattern
- If it recurs, check that backend isn't timing out
- Increase timeout in command files if needed: `timeout: 5000`

### Connection drops
- Bot should auto-reconnect (keep-alive loop active)
- If keeps dying, check Discord token validity
- Network issues? Verify EllaMac connectivity

---

## Performance Notes

- **Startup:** ~3 seconds to connect and register commands
- **Response time:** 200-500ms (backend fetch + embed building)
- **Memory:** ~100-110 MB per instance
- **CPU:** Minimal (event-driven)

---

## Updates

To update the bot code:

```bash
cd /Users/ellis/.openclaw/workspace/nba-analyzer
git pull origin main
cd discord-bot
pkill -f "node index.js"
sleep 2
./start.sh
```

Or if using LaunchAgent:
```bash
launchctl stop com.discord-bot.nba
cd /Users/ellis/.openclaw/workspace/nba-analyzer
git pull origin main
launchctl start com.discord-bot.nba
```

---

## Commands Reference

### /help
Shows all available commands and usage.

### /predict [player] [stat_type]
Get ML prediction for a player's stat.
- **player:** Player name (e.g., "Luka Doncic")
- **stat_type:** points, assists, or rebounds

Example: `/predict Luka Doncic points`

### /sentiment [player]
Analyze sentiment from social sources (Reddit, ESPN, Twitter).
- **player:** Player name

Example: `/sentiment LeBron James`

### /stats [player]
Display season stats + current analysis.
- **player:** Player name

Example: `/stats Giannis Antetokounmpo`

---

## API Integration

Bot connects to backend at: `http://192.168.10.101:3000`

Endpoints used:
- `GET /api/research/:playerName?prop=[points|assists|rebounds]`

Response includes:
- Prediction (OVER/UNDER/NEUTRAL)
- Confidence score (0-1)
- Sentiment breakdown
- Stat weights

---

## Support

Check logs at:
- `/tmp/discord-bot.log` — Main output
- `/tmp/discord-bot-stdout.log` — Redirect output (if using LaunchAgent)
- `/tmp/discord-bot-stderr.log` — Error output (if using LaunchAgent)

---

**Last Updated:** March 1, 2026
**Status:** Production Ready ✅
