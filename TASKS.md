# Phase 6B Tasks - VIP Alert Gating

## Priority: High

### Backend Tasks
- [x] **Implement VIP gating helper functions in `_firebase.ts`**
  - `isUserVip()`, `canReceiveAlertType()`, `getEligibleFavoritePlayerIds()`
- [x] **Update cron endpoint (`cron-saved-player-alerts.ts`)**
  - Use VIP gating functions
  - Respect free tier limits (first 3 favorites)
- [ ] **Update manual notification endpoint (`favorites.ts`)**
  - Update imports to include VIP functions
  - Modify logic to use `getEligibleFavoritePlayerIds()`
  - Add VIP status logging
- [ ] **Create test VIP user in Firestore**
  - Add `test@example.com` to `vip_users` collection for testing
  - Create separate free test account
- [ ] **Test backend enforcement**
  - Test with free account (limit to 3 favorites)
  - Test with VIP account (unlimited favorites)
  - Verify error handling

### Mobile UI Tasks
- [ ] **Update notification settings screen**
  - Show locked state for premium alerts (free users)
  - Show enabled state for all alerts (VIP users)
  - Add upgrade messaging
- [ ] **Implement upgrade messaging triggers**
  - When trying to enable locked premium alert
  - When favoriting 4th player (free users)
  - When viewing premium features
- [ ] **Add user tier detection**
  - Check VIP status on app load
  - Update UI state based on tier
  - Cache tier to reduce API calls

### Documentation Tasks
- [x] **Update `ALERT_GATING.md`**
  - Correct free tier limits (first 3 favorites)
  - Document VIP tier benefits
- [x] **Create `PHASE6B_STATUS.md`**
  - Implementation status
  - Technical details
  - Testing requirements
- [x] **Create `TASKS.md`** (this file)
  - Track remaining work
  - Assign priorities
- [ ] **Create `MOBILE_BACKEND_AUDIT.md`**
  - API endpoints needing updates
  - Data flow documentation
  - Security considerations

## Priority: Medium

### Integration Tasks
- [ ] **Discord VIP role integration**
  - Connect `isUserVip()` to Discord webhook
  - Sync existing web VIP users
  - Cache Discord role checks
- [ ] **Add admin tools for VIP management**
  - Simple UI to add/remove VIP users
  - View current VIP users
  - Set expiration dates
- [ ] **Add metrics and logging**
  - Track alert sends by user tier
  - Log VIP status checks
  - Monitor free tier limit enforcement

### Testing Tasks
- [ ] **Create comprehensive test suite**
  - Unit tests for VIP functions
  - Integration tests for notification flow
  - E2E tests with free/VIP accounts
- [ ] **Test edge cases**
  - User with 0 favorites
  - User with exactly 3 favorites
  - User transitioning from free to VIP
  - Expired VIP users
- [ ] **Performance testing**
  - VIP status check performance
  - Favorite filtering performance
  - Concurrent user handling

## Priority: Low (Future Phases)

### Billing Integration (Phase 6C+)
- [ ] **Stripe subscription integration**
  - Web subscription flow
  - Webhook for subscription events
  - Sync with Firestore `vip_users`
- [ ] **RevenueCat integration**
  - Mobile in-app purchases
  - Subscription status sync
  - Cross-platform entitlement
- [ ] **Apple/Google billing**
  - StoreKit implementation
  - Play Billing implementation
  - Receipt validation

### Advanced Features
- [ ] **Tiered pricing**
  - Different VIP tiers (Basic, Pro, Enterprise)
  - Feature gating per tier
  - Upgrade/downgrade paths
- [ ] **Trial periods**
  - Free trials for new users
  - Trial expiration handling
  - Conversion tracking
- [ ] **Family sharing**
  - Family plans
  - Shared entitlements
  - Usage limits

## Definition of Done

Phase 6B is complete only if:

### ✅ Backend Enforcement:
1. Free vs VIP alert rules enforced in backend
2. Free user limit on saved-player alerts works (first 3 only)
3. VIP user unlocks premium alert types automatically
4. Backend blocks unauthorized premium sends for free users

### ✅ Mobile UI:
1. Mobile UI reflects free/VIP rules clearly
2. Premium alerts locked for free users
3. Upgrade messaging appears in appropriate places
4. User tier detection works correctly

### ✅ Testing:
1. Tested with free account (respects limits)
2. Tested with VIP account (unlocks features)
3. Edge cases handled gracefully
4. No billing implementation introduced yet

### ✅ Documentation:
1. `ALERT_GATING.md` updated with correct rules
2. `PHASE6B_STATUS.md` created with implementation details
3. `TASKS.md` tracking remaining work
4. `MOBILE_BACKEND_AUDIT.md` created for frontend team

## Current Status

**Date:** 2026-03-25  
**Progress:** 40% complete  
**Blockers:** None  
**Next Action:** Update `favorites.ts` notification handler

---

**Last Updated:** 2026-03-25  
**Owner:** Backend Team  
**Reviewer:** Chuler