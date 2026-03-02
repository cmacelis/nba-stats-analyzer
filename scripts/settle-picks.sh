#!/usr/bin/env bash
# settle-picks.sh — Settle unsettled bets by calling the production API
#
# Designed to run as a cron job at 3:30 AM ET (08:30 UTC):
#   30 8 * * * /Users/ellis/.openclaw/workspace/nba-analyzer/scripts/settle-picks.sh >> /tmp/nba-settle-$(date +\%Y\%m\%d).log 2>&1
#
# Or via EllaMac launchd / Automator at 3:30 AM local time.

set -euo pipefail

PROD_URL="https://nba-stats-analyzer-chuers-projects.vercel.app"
ENDPOINT="${PROD_URL}/api/picks/settle?lookback_days=3"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Running pick settlement..."

response=$(curl -sf -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  --max-time 60)

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Response: ${response}"

# Parse and log counts if jq is available
if command -v jq &>/dev/null; then
  checked=$(echo "${response}" | jq -r '.checked // "?"')
  settled=$(echo "${response}" | jq -r '.settled // "?"')
  skipped=$(echo "${response}" | jq -r '.skipped // "?"')
  errors=$(echo  "${response}" | jq -r '.errors  // "?"')
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] checked=${checked} settled=${settled} skipped=${skipped} errors=${errors}"
fi
