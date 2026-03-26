# Phase 6B Status - VIP Alert Gating

## Overview
Implementation of premium alert gating using existing $19/month VIP entitlement system.

## Implementation Status

### ✅ **Completed:**

**1. Backend VIP Gating Functions (in `_firebase.ts`):**
- `isUserVip(userEmail)` - Checks VIP status (currently checks `vip_users` collection)
- `canReceiveAlertType(userEmail, alertType)` - Determines if user can receive specific alert type
- `getEligibleFavoritePlayerIds(userEmail, allFavoriteIds)` - Returns eligible favorites (first 3 for free users)
- `addUserToVip(userEmail)` / `removeUserFromVip(userEmail)` - Admin functions for testing
- `getUserSubscriptionStatus(userEmail)` - Returns detailed subscription info

**2. Updated Cron Endpoint (`cron-saved-player-alerts.ts`):**
- Uses `getEligibleFavoritePlayerIds()` to respect free tier limits
- Uses `canReceiveAlertType()` to check alert permissions
- Logs VIP status and eligible favorites count

**3. Documentation Updated:**
- `ALERT_GATING.md` updated with correct free tier limits (first 3 favorites only)

### 🔄 **In Progress:**

**1. Manual Notification Endpoint (`favorites.ts`):**
- Imports updated to include VIP functions
- Logic needs to be updated to use VIP gating (similar to cron endpoint)

**2. Mobile UI Updates:**
- Need to update notification settings UI to reflect gating
- Show locked state for premium alerts for free users
- Display upgrade messaging

### 📋 **Pending:**

**1. Backend Enforcement Tests:**
- Test with free account (should only get alerts for first 3 favorites)
- Test with VIP account (should get all alerts)
- Verify backend blocks unauthorized premium sends

**2. Mobile UI Implementation:**
- Update React Native notification settings screen
- Add VIP upgrade messaging
- Handle 4th favorite limit for free users

**3. Discord VIP Integration:**
- Connect `isUserVip()` to Discord webhook for existing VIP users
- Ensure web VIP users are recognized in mobile

## Technical Implementation

### VIP Status Storage:
```typescript
// Firestore collection: vip_users
{
  user_email: "user@example.com",
  status: "active",
  tier: "premium",
  price: 19, // $19/month
  added_at: "2026-03-25T23:30:00Z",
  expires_at: "2026-04-24T23:30:00Z",
  source: "discord" // or "stripe", "manual_admin"
}
```

### Alert Type Permissions:
- **Free users:** `saved_player_edge` only (first 3 favorites)
- **VIP users:** All alert types (`saved_player_edge`, `daily_top_edge`, `game_day`)

### Favorite Eligibility Logic:
```typescript
// Free users: Only first 3 favorites eligible
const eligibleFavorites = allFavorites.slice(0, 3);

// VIP users: All favorites eligible
const eligibleFavorites = allFavorites;
```

## Testing Requirements

### Test Accounts Needed:
1. **Free account:** `free@example.com` (no VIP status)
2. **VIP account:** `vip@example.com` (active in `vip_users` collection)

### Test Scenarios:

**Free User:**
- [ ] Can only receive saved player alerts
- [ ] Only first 3 favorites eligible for alerts
- [ ] 4th+ favorite saved but no alerts sent
- [ ] Premium alert toggles locked in UI
- [ ] Upgrade messaging appears when trying to enable premium alerts

**VIP User:**
- [ ] Can receive all alert types
- [ ] All favorites eligible for alerts
- [ ] All alert toggles active in UI
- [ ] No upgrade messaging shown

## Mobile UI Requirements

### Notification Settings Screen:
```
Saved Player Alerts: [✅ Enabled] (free & VIP)
Daily Top Edge: [🔒 Locked] (free) / [✅ Enabled] (VIP)
Game Day Alerts: [🔒 Locked] (free) / [✅ Enabled] (VIP)

[Upgrade to VIP for premium alerts] (free users only)
```

### Upgrade Messaging Triggers:
1. **Trying to enable locked premium alert** → Show upgrade modal
2. **Favoriting 4th player (free user)** → Show upgrade suggestion
3. **Viewing premium features** → Show VIP benefits

## Backend Security

### Enforcement Points:
1. **Notification sending:** Check `canReceiveAlertType()` before sending
2. **Favorite eligibility:** Use `getEligibleFavoritePlayerIds()` to filter
3. **API responses:** Include user tier in relevant responses

### Default Behavior:
- **On error:** Default to free tier (safe mode)
- **Missing VIP data:** Assume free user
- **Expired VIP:** Revert to free tier

## Next Steps

### Immediate (Phase 6B):
1. Complete `favorites.ts` notification handler updates
2. Create test VIP user in Firestore
3. Test backend enforcement
4. Document mobile UI requirements for frontend team

### Future (Phase 6C+):
1. Discord VIP role integration
2. Stripe subscription integration
3. RevenueCat for mobile purchases
4. Apple/Google in-app purchases

## Notes

### Current Limitations:
- VIP status stored in Firestore `vip_users` collection (manual/admin)
- Discord VIP role integration not yet implemented
- No billing/StoreKit implementation (per requirements)

### Migration Path:
1. Phase 6B: Manual VIP management (admin tools)
2. Phase 6C: Discord VIP sync (existing web users)
3. Phase 6D: Stripe integration (new subscriptions)
4. Phase 6E: Mobile in-app purchases

---

**Last Updated:** 2026-03-25  
**Phase:** 6B (VIP Alert Gating - Backend Implementation)  
**Status:** Backend functions implemented, awaiting testing and mobile UI updates