#!/bin/bash

# Phase 5 Deployment Script
# Run after Firebase credentials are available

set -e

echo "🚀 Phase 5 Deployment Script"
echo "============================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

die() {
  echo -e "${RED}ERROR: $1${NC}"
  exit 1
}

info() {
  echo -e "${YELLOW}ℹ $1${NC}"
}

success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# Check for required env vars
REQUIRED_VARS="FIREBASE_API_KEY FIREBASE_AUTH_DOMAIN FIREBASE_PROJECT_ID FIREBASE_STORAGE_BUCKET FIREBASE_MESSAGING_SENDER_ID FIREBASE_APP_ID"
missing_vars=""
for var in $REQUIRED_VARS; do
  if [ -z "${!var}" ]; then
    missing_vars="$missing_vars $var"
  fi
done

if [ -n "$missing_vars" ]; then
  die "Missing Firebase env vars:$missing_vars\nSet them in environment before running this script."
fi

info "Firebase credentials verified"
info "Project ID: $FIREBASE_PROJECT_ID"

# Step 1: Update Discord bot .env
echo ""
info "Step 1: Updating Discord bot .env"
DISCORD_BOT_ENV="/Users/ellis/.openclaw/workspace/nba-analyzer/discord-bot/.env"

# Backup original
cp "$DISCORD_BOT_ENV" "${DISCORD_BOT_ENV}.backup.$(date +%s)"

# Add Firebase vars to .env
cat >> "$DISCORD_BOT_ENV" << EOF

# Firebase for Phase 5 (Personalized Alerts)
FIREBASE_API_KEY=$FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN=$FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID
FIREBASE_STORAGE_BUCKET=$FIREBASE_STORAGE_BUCKET
FIREBASE_MESSAGING_SENDER_ID=$FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID=$FIREBASE_APP_ID
EOF

success "Updated Discord bot .env"

# Step 2: Restart Discord bot
echo ""
info "Step 2: Restarting Discord bot"
pkill -f "node.*discord-bot" 2>/dev/null || info "No running bot found (ok)"

cd /Users/ellis/.openclaw/workspace/nba-analyzer/discord-bot
nohup ./start.sh > /dev/null 2>&1 &
sleep 3

# Check if bot started
if ps aux | grep -q "node.*index.js" | grep -v grep; then
  success "Discord bot restarted"
else
  die "Failed to restart Discord bot"
fi

# Step 3: Check bot logs for Firebase connection
echo ""
info "Step 3: Checking bot logs for Firebase connection"
sleep 2
if tail -20 /tmp/discord-bot.log 2>/dev/null | grep -q "Alert Processor\|Firebase"; then
  success "Bot logs show Firebase/Alert Processor activity"
else
  info "Bot logs don't show Firebase yet (might need time to start)"
fi

# Step 4: Run tests
echo ""
info "Step 4: Running Phase 5 tests"
cd /Users/ellis/.openclaw/workspace/nba-analyzer
export API_BASE_URL="https://edgedetector.ai"
./scripts/test-phase5.sh

# Step 5: Manual test instructions
echo ""
info "Step 5: Manual Testing Instructions"
echo ""
echo "1. In Discord, run:"
echo "   /track league:nba stat:pts direction:over mindelta:2.0"
echo ""
echo "2. Check rule was created:"
echo "   /rules"
echo ""
echo "3. Trigger alert detection:"
echo "   curl -X POST 'https://edgedetector.ai/api/alerts/run-enhanced?check_user_rules=true&league=nba&stat=pts&min_delta=0.5&top_n=1'"
echo ""
echo "4. Wait ~30 seconds for DM"
echo ""
echo "5. Clean up:"
echo "   /untrack ruleid:<rule_id_from_step2>"
echo ""
echo "6. Verify rule removed:"
echo "   /rules"

# Step 6: Cron update reminder
echo ""
info "Step 6: Cron Update Required"
echo ""
echo "Update the alert cron job to use:"
echo "  /api/alerts/run-enhanced?check_user_rules=true&league=nba&stat=pts&direction=both&min_delta=2.0&min_minutes=20&top_n=10"
echo ""
echo "Check current cron location:"
echo "  - User crontab (crontab -l)"
echo "  - System crontab (/etc/crontab)"
echo "  - LaunchAgents (~/Library/LaunchAgents/)"
echo "  - Vercel cron (if using Vercel cron jobs)"

echo ""
success "Phase 5 deployment script complete!"
echo ""
echo "Next:"
echo "1. Add same Firebase env vars to Vercel (Production)"
echo "2. Trigger Vercel redeploy"
echo "3. Test endpoints manually"
echo "4. Update cron job"