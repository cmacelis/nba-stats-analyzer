#!/bin/bash
# Start the Discord bot (use node directly, not npm)
pkill -f "node index.js" 2>/dev/null
cd "$(dirname "$0")"
nohup node index.js > bot.log 2>&1 &
echo "🤖 Bot started (PID: $!)"
echo "Logs: tail -f bot.log"
