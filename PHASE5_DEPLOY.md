# Phase 5: Quick Deployment Checklist

**Status:** Ready to deploy  
**Estimated time:** 15-20 minutes setup + testing

---

## Step 1: Prepare Firebase Env Vars (2 min)

Get these from Firebase console (Settings → Service Accounts):

```env
FIREBASE_API_KEY=AIza...
FIREBASE_AUTH_DOMAIN=project.firebaseapp.com
FIREBASE_PROJECT_ID=project-id
FIREBASE_STORAGE_BUCKET=project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abc123...
```

---

## Step 2: Deploy Backend to Vercel (3 min)

### Update `.env.local` in Vercel

1. Go to https://vercel.com/dashboard
2. Select `nba-stats-analyzer-chuers-projects`
3. Settings → Environment Variables
4. Add all `FIREBASE_*` vars from Step 1

### Push to main branch

```bash
cd ~/.openclaw/workspace/nba-analyzer
git add -A
git commit -m "feat: Phase 5 personalized alert rules"
git push origin main
```

Vercel auto-deploys. Check: https://edgedetector.ai/api/health (should be ✓)

---

## Step 3: Update Alert Cron Job (2 min)

Update the cron job to use the enhanced endpoint.

**Find the current cron:**
- On EllaMac, check LaunchAgent or crontab
- Should be calling `/api/alerts/run?stat=pts&direction=both...`

**Change to:**
```
/api/alerts/run-enhanced?stat=pts&direction=both&check_user_rules=true&league=nba
```

This enables the new personalized rules checking.

---

## Step 4: Deploy Discord Bot (3 min)

### Update Discord bot `.env`

```bash
cd ~/.openclaw/workspace/nba-analyzer/discord-bot
```

Add to `.env`:
```env
FIREBASE_API_KEY=AIza...
FIREBASE_AUTH_DOMAIN=project.firebaseapp.com
FIREBASE_PROJECT_ID=project-id
FIREBASE_STORAGE_BUCKET=project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abc123...
API_BASE_URL=https://edgedetector.ai
```

### Restart bot

```bash
pkill -f "node.*discord-bot"
cd discord-bot
./start.sh
```

### Verify startup

```bash
sleep 3
tail -f bot.log
```

Look for:
```
✓ Loaded command: track
✓ Loaded command: rules
✓ Loaded command: untrack
✓ Alert processor started
```

---

## Step 5: Test in Discord (5-10 min)

### Test 1: Create Rule
```
/track league:nba stat:pts direction:over mindelta:2.0
```

Expected: ✅ Rule created with ID

### Test 2: List Rules
```
/rules
```

Expected: 📋 Shows the rule you just created

### Test 3: Trigger Detection
Manually call alerts endpoint:
```bash
curl -X POST "https://edgedetector.ai/api/alerts/run-enhanced?stat=pts&direction=both&check_user_rules=true" \
  -H "Content-Type: application/json"
```

Check Firestore → `pending_alerts` collection  
Should see a new alert document

### Test 4: Verify DM
Wait ~30 seconds. Check Discord DMs.  
Should receive message like:
```
🔔 Personal Alert Triggered!
[Player Name] — PTS Over Edge
+2.3 vs season average
```

### Test 5: Delete Rule
```
/untrack ruleid:<copy from /rules output>
```

Expected: ✅ Rule deleted

---

## Step 6: Test Firestore (Optional)

Go to https://console.firebase.google.com

**Check alert_rules collection:**
```
Collection: alert_rules
Filter: userId == <your_discord_id>
```

Should see your test rule(s)

**Check pending_alerts collection:**
```
Collection: pending_alerts
```

Should be empty after ~1 minute (means alerts were processed)

---

## Troubleshooting

### Bot commands not showing
```bash
# Restart bot
pkill -f "node.*discord-bot"
cd discord-bot && ./start.sh
```

### DM not received
1. Check Discord privacy settings (allow DMs)
2. Check bot.log for errors:
   ```bash
   tail -f discord-bot/bot.log | grep "Alert Processor"
   ```
3. Check Firestore pending_alerts (should be empty if processed)

### Rule not saving
1. Check Firebase env vars in Vercel settings
2. Verify Firestore database is created
3. Check API response:
   ```bash
   curl -X POST https://edgedetector.ai/api/alerts/rules/track \
     -H "Content-Type: application/json" \
     -d '{"userId":"test","league":"nba","stat":"pts","direction":"over","minDelta":2.0}'
   ```

### Firestore rules error
If you get permission denied:
1. Go to Firestore console
2. Rules → Set to test mode (allow all reads/writes for now)
3. Tighten security rules later

---

## Run Full Test Suite (5 min)

Automated tests for API endpoints:

```bash
cd ~/.openclaw/workspace/nba-analyzer
API_BASE_URL=https://edgedetector.ai ./scripts/test-phase5.sh
```

Expected: All tests pass ✓

---

## Post-Deployment

### Monitor
```bash
# Watch Discord bot
tail -f discord-bot/bot.log | grep "Alert Processor"

# Watch Vercel logs
vercel logs nba-stats-analyzer-chuers-projects
```

### Watch Firestore
- `alert_rules`: Should grow as users create rules
- `pending_alerts`: Should stay near empty (processes quickly)

---

## Rollback (if needed)

```bash
# Revert to original alerts endpoint
# Update cron job back to /api/alerts/run (without run-enhanced)
# Restart Discord bot: pkill discord-bot && cd discord-bot && ./start.sh
```

---

## What Users See

**Discord (new):**
- `/track` command to create alerts
- `/rules` command to see their rules
- `/untrack` command to remove rules
- DMs when their rules match edges

**No breaking changes** to existing `/predict`, `/sentiment`, `/stats` commands

---

## Checklist Summary

- [ ] Added FIREBASE_* to Vercel env
- [ ] Pushed main to deploy backend
- [ ] Updated cron job to run-enhanced
- [ ] Added FIREBASE_* to discord-bot/.env
- [ ] Restarted Discord bot
- [ ] Tested /track command
- [ ] Tested /rules command
- [ ] Triggered alert detection
- [ ] Verified DM received
- [ ] Tested /untrack command
- [ ] Ran ./scripts/test-phase5.sh
- [ ] Monitored logs (no errors)

---

**Questions?** Check PHASE5_IMPLEMENTATION.md for detailed docs.

**Ready to go! 🚀**