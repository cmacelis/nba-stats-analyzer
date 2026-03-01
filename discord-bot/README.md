# NBA Stats Analyzer Discord Bot - Phase 2

A Discord slash command bot for NBA player stats, predictions, and sentiment analysis.

## Setup

### Prerequisites
- Node.js 16+
- `.env` file with:
  - `DISCORD_TOKEN` - Your bot token
  - `CLIENT_ID` - Your bot's client ID
  - `GUILD_ID` - Your Discord server ID
  - `NBA_API_BASE` - Backend API base URL (default: `http://localhost:3000`)

### Installation

```bash
npm install
```

### Running

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

## Commands

### `/predict <player> <stat_type>`
Get ML prediction for a player stat (OVER/UNDER).

**Parameters:**
- `player` - Player name (e.g., "LeBron James")
- `stat_type` - points | assists | rebounds

**Fetches:** `GET /api/research/predict?playerName=...&statType=...`

**Display:**
- Player name
- Prediction (OVER/UNDER)
- Sentiment score (-1 to +1)
- 24h trend

---

### `/sentiment <player>`
Get sentiment analysis for a player across Reddit, ESPN, and Twitter.

**Parameters:**
- `player` - Player name

**Fetches:** `GET /api/research/sentiment?playerName=...`

**Display:**
- Overall sentiment (-1 to +1)
- Per-source breakdown (Reddit, ESPN, Twitter)
- Trend

---

### `/stats <player>`
Get season stats and last 5 games for a player.

**Parameters:**
- `player` - Player name

**Fetches:** `GET /api/player/[playerName]`

**Display:**
- Season averages (PPG, APG, RPG)
- Last 5 games

---

### `/help`
Show available commands and usage examples.

---

## Features

✅ **Slash Commands** - Modern Discord UI
✅ **Discord Embeds** - Clean, formatted responses
✅ **Rate Limiting** - 1 request per user per 2 seconds
✅ **Error Handling** - Graceful backend offline messages
✅ **Logging** - Console logs all requests and responses
✅ **Timeout Protection** - 5-second API timeouts

## Architecture

```
discord-bot/
├── index.js              # Main entry point & command loader
├── commands/
│   ├── predict.js        # /predict command
│   ├── sentiment.js      # /sentiment command
│   ├── stats.js          # /stats command
│   └── help.js           # /help command
├── .env                  # Environment variables
├── package.json
└── README.md
```

## Error Handling

- **Backend Offline:** "❌ Backend offline"
- **Player Not Found:** "❌ Player not found"
- **Timeout:** "❌ Request timed out"
- **Rate Limited:** "⏱️ Slow down! 1 request per 2 seconds"

## Logging

All requests are logged to console with timestamps:

```
📨 Command: /predict from username#1234
   Params: {"player":"LeBron James","stat_type":"points"}
   ✓ Prediction fetched: LeBron James points → OVER
```

## Development Notes

- Commands are **loaded dynamically** from `commands/` on bot startup
- Rate limiting is **per-user** via Discord user ID
- All API responses are **validated** before rendering
- **No authentication needed** (Phase 2 endpoints are public)
