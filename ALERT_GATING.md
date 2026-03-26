# Alert Gating System - Phase 6

## Overview
Defines which alert types are available to free vs VIP users, preserving test-token safety and preparing for production validation.

## Alert Types

### 1. Saved Player Alerts
- **Trigger:** When a saved player appears in today's edge feed
- **Frequency:** Once per player per day (dedupe protected)
- **Free Tier:** ✅ INCLUDED
- **VIP Tier:** ✅ INCLUDED
- **Implementation:** `favorites.ts` notification handler

### 2. Daily Top Edge Alerts
- **Trigger:** Top edge of the day (highest PRA/edge score)
- **Frequency:** Once per day
- **Free Tier:** ❌ NOT INCLUDED
- **VIP Tier:** ✅ INCLUDED
- **Implementation:** To be built (separate cron/endpoint)

### 3. Game Day Alerts
- **Trigger:** Game day notifications (lineup changes, injury updates)
- **Frequency:** As needed on game days
- **Free Tier:** ❌ NOT INCLUDED
- **VIP Tier:** ✅ INCLUDED
- **Implementation:** To be built (game day monitoring)

## User Subscription Status

### Free Tier Users
- Access to saved player alerts only
- **Limit:** Only first 3 saved players eligible for alerts
- No daily top edge alerts
- No game day alerts
- Can save unlimited players (but only first 3 get alerts)
- Dedupe protection works normally

### VIP Tier Users ($19/month)
- Access to all alert types
- Saved player alerts (unlimited favorites)
- Daily top edge alerts  
- Game day alerts
- Priority support
- Advanced analytics

## Implementation Plan

### Phase 6A: Automated Saved Player Alerts (Current)
- ✅ Cron job: `/api/cron-saved-player-alerts`
- ✅ Schedule: Daily 10:00 AM EDT (14:00 UTC)
- ✅ Security: CRON_SECRET required
- ✅ Test token safety: No dedupe poisoning
- ✅ Free tier: Included for all users

### Phase 6B: VIP Gating Infrastructure
1. **User subscription tracking** (Firestore `users` collection)
2. **Subscription check helper** in `_firebase.ts`
3. **VIP-only endpoints** for premium alerts
4. **Grace period handling** for expired subscriptions

### Phase 6C: Daily Top Edge Alerts
1. **Edge ranking system** (identify top edge)
2. **VIP-only cron job** for top edge alerts
3. **Dedupe protection** (once per day)
4. **Test token safety** integration

### Phase 6D: Game Day Alerts
1. **Game day detection** (schedule monitoring)
2. **Lineup/injury monitoring** (data sources)
3. **VIP-only alerts** on game days
4. **Frequency controls** (avoid alert fatigue)

## Test Token Safety

### Current Implementation (✅ VERIFIED)
```typescript
function isTestDeviceToken(token: string): boolean {
  // Detects: ExpoPushToken[TestDevice, test_token, fake_token, etc.
  // Test tokens: No dedupe records created
  // Real tokens: Proper dedupe protection
}
```

### Safety Rules:
1. **Test tokens never create dedupe records**
2. **Can test repeatedly with same player**
3. **Real tokens get proper dedupe protection**
4. **Clear logging distinguishes real vs test**

## Production Token Validation Checklist

### Before Going Live:
1. [ ] **Expo Access Token** configured in environment
2. [ ] **Real device tokens** registered in Firestore
3. [ ] **Test token detection** verified working
4. [ ] **Dedupe protection** verified for real tokens
5. [ ] **Cron job** tested with manual trigger
6. [ ] **Error handling** tested (Expo API failures)
7. [ ] **Rate limiting** considered (Expo limits)
8. [ ] **Monitoring** setup (logs, error tracking)

### Validation Steps:
1. **Manual test** with real device token
2. **Verify dedupe record** created (Firestore)
3. **Verify notification** received on device
4. **Test repeated trigger** (should be blocked by dedupe)
5. **Test different player** (should work)
6. **Verify test tokens** still work without dedupe

## Environment Variables

### Required:
```bash
# Firebase
FIREBASE_PROJECT_ID="edgedetectyor"
FIREBASE_API_KEY="AIzaSyB1jn14N7_1qLcTcoBLPN8S7tmSQXTumP0"

# Expo
EXPO_ACCESS_TOKEN="<expo-access-token>"

# Cron Security
CRON_SECRET="e2765ccb94002b94d03844d4850a8d00f5ed2369d21bca9e1033092949f8fb0e"
```

### Optional (for VIP features):
```bash
# Stripe (for subscription checking)
STRIPE_SECRET_KEY="<stripe-secret-key>"
STRIPE_WEBHOOK_SECRET="<stripe-webhook-secret>"
```

## Deployment Checklist

### Phase 6A (Current):
- [x] Create cron endpoint: `/api/cron-saved-player-alerts`
- [x] Configure Vercel cron schedule: `0 14 * * *` (10:00 AM EDT)
- [x] Add CRON_SECRET environment variable
- [x] Preserve test token safety (no dedupe poisoning)
- [x] Document production validation steps
- [ ] Deploy and test cron manually
- [ ] Verify security (CRON_SECRET required)
- [ ] Test with test tokens (no dedupe)
- [ ] Prepare for real token testing

### Future Phases:
- [ ] Phase 6B: VIP gating infrastructure
- [ ] Phase 6C: Daily top edge alerts (VIP only)
- [ ] Phase 6D: Game day alerts (VIP only)
- [ ] Phase 6E: Subscription management UI
- [ ] Phase 6F: Alert preferences customization

## Security Considerations

1. **Cron Security:** CRON_SECRET required for automated calls
2. **Token Safety:** Test tokens never poison dedupe
3. **User Data:** Only send to registered device tokens
4. **Rate Limiting:** Respect Expo API limits
5. **Error Handling:** Graceful failure, no data loss
6. **Logging:** Clear audit trail of all sends

## Monitoring & Maintenance

### Daily Checks:
1. Cron execution logs (Vercel logs)
2. Notification success/failure rates
3. Expo API errors
4. Firestore dedupe record counts
5. User subscription status sync

### Alerting:
1. Cron failure alerts (Vercel notifications)
2. Expo API error rate alerts
3. Subscription sync failures
4. Database connection issues

---

**Last Updated:** 2026-03-25  
**Phase:** 6A (Automated Saved Player Alerts)  
**Status:** Implemented, awaiting deployment and testing