#!/bin/bash
# Start EdgeDetector Telegram Bot
pkill -f "telegram-bot.*node index.js" 2>/dev/null
cd "$(dirname "$0")"
nohup node index.js >> bot.log 2>&1 &
echo "EdgeBot started (PID: $!)"
echo "Logs: tail -f $(pwd)/bot.log"
