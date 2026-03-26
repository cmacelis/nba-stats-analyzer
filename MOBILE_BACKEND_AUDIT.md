# Mobile Backend Audit - VIP Alert Gating

## Overview
Documentation of backend changes required for mobile app to support VIP alert gating.

## API Endpoints Needing Updates

### 1. Notification Settings Endpoint
**Current:** Returns user's notification preferences  
**Needs:** Include user tier and alert type permissions

**Suggested Response Format:**
```json
{
  "user": {
    "email": "user@example.com",
    "tier": "free", // or "premium"
    "is_vip": false,
    "subscription_expires_at": null // or ISO date string
  },
  "notification_settings": {
    "saved_player_alerts": {
      "enabled": true,
      "can_enable": true, // Always true for saved player alerts
      "limit": 3 // For free users: first 3 favorites only
    },
    "daily_top_edge_alerts": {
      "enabled": false,
      "can_enable": false, // Free users: false, VIP: true
      "locked_reason": "upgrade_to_vip" // or null for VIP
    },
    "game_day_alerts": {
      "enabled": false,
      "can_enable": false, // Free users: false, VIP: true
      "locked_reason": "upgrade_to_vip" // or null for VIP
    }
  },
  "upgrade_messaging": {
    "title": "Upgrade to VIP",
    "message": "Unlock premium alerts for $19/month",
    "cta": "Upgrade Now"
  }
}
```

### 2. User Profile/Status Endpoint
**Current:** Returns basic user info  
**Needs:** Include subscription status and tier

**Suggested Response Format:**
```json
{
  "user": {
    "email": "user@example.com",
    "name": "User Name",
    "tier": "free",
    "is_vip": false,
    "vip_since": null,
    "vip_expires_at": null,
    "favorite_count": 6,
    "eligible_favorite_count": 3 // For free users: min(3, total)
  }
}
```

### 3. Favorite Player Endpoint
**Current:** Returns list of favorite players  
**Needs:** Indicate which favorites are eligible for alerts

**Suggested Response Format:**
```json
{
  "favorites": [
    {
      "player_id": 123,
      "player_name": "Player Name",
      "created_at": "2026-03-25T12:00:00Z",
      "eligible_for_alerts": true, // For free users: only first 3
      "alert_eligibility_reason": "within_limit" // or "vip_user", "exceeds_limit"
    }
  ],
  "limits": {
    "max_favorites_for_alerts": 3, // For free users, null for VIP
    "current_eligible_count": 3,
    "is_vip": false
  }
}
```

## New Backend Functions Available

### VIP Status Functions (in `_firebase.ts`):
```typescript
// Check if user is VIP
const isVip = await isUserVip(userEmail);

// Check if user can receive specific alert type
const canReceive = await canReceiveAlertType(userEmail, 'daily_top_edge');

// Get eligible favorite player IDs (respects free tier limits)
const eligibleIds = await getEligibleFavoritePlayerIds(userEmail, allFavoriteIds);

// Get detailed subscription status
const status = await getUserSubscriptionStatus(userEmail);
// Returns: { isVip: boolean, tier: 'free'|'premium', expiresAt?: string }
```

## Mobile UI Integration Points

### 1. Notification Settings Screen
**Data needed:**
- User tier (free/premium)
- Which alert types are enabled/can be enabled
- Upgrade messaging for free users

**Backend source:** `/api/user/notification-settings` (new endpoint suggested)

### 2. Favorite Players Screen
**Data needed:**
- Which favorites are eligible for alerts
- Current limit (3 for free users)
- Upgrade prompt when adding 4th favorite

**Backend source:** `/api/favorites` (updated response)

### 3. User Profile Screen
**Data needed:**
- User tier and VIP status
- Subscription expiration (if VIP)
- Favorite counts (total vs eligible)

**Backend source:** `/api/user/profile` (updated response)

## Upgrade Messaging Triggers

### Backend should provide context:
1. **When viewing premium features:**
   - Which features are locked
   - Why they're locked (VIP only)
   - Upgrade CTA

2. **When hitting free tier limits:**
   - Trying to enable 4th favorite for alerts
   - Trying to enable premium alert type
   - Clear messaging about limits

3. **Passive upgrade suggestions:**
   - In notification settings
   - In favorite player lists
   - In user profile

## Security Considerations

### Backend Enforcement (CRITICAL):
- **Never** rely solely on frontend/UI gating
- **Always** check `canReceiveAlertType()` before sending notifications
- **Always** use `getEligibleFavoritePlayerIds()` for filtering
- **Default to free tier** on any error or missing data

### User Tier Detection:
- Cache tier in mobile app to reduce API calls
- Refresh tier on app launch and periodically
- Handle tier changes gracefully (VIP → free)

## Testing Requirements for Mobile

### Test Accounts:
1. **Free account:** `free-test@example.com`
   - No VIP status
   - Should see locked premium features
   - Should be limited to 3 favorites for alerts

2. **VIP account:** `vip-test@example.com`
   - Active in `vip_users` collection
   - Should see all features unlocked
   - Should have unlimited favorite alerts

### Test Scenarios:
1. **Free user:**
   - View notification settings (see locked features)
   - Add 4th favorite (see upgrade suggestion)
   - Try to enable premium alert (see upgrade modal)
   - Receive alerts for first 3 favorites only

2. **VIP user:**
   - View notification settings (all features unlocked)
   - Add unlimited favorites (all eligible for alerts)
   - Enable all alert types
   - Receive all alert types

## Implementation Timeline

### Phase 1: Backend Updates (Current)
- [x] Implement VIP gating functions
- [x] Update cron notification endpoint
- [ ] Update manual notification endpoint
- [ ] Create/update API endpoints for mobile

### Phase 2: Mobile UI Updates
- [ ] Update notification settings screen
- [ ] Update favorite players screen
- [ ] Add upgrade messaging
- [ ] Implement tier detection

### Phase 3: Testing & Polish
- [ ] Test with free/VIP accounts
- [ ] Verify backend enforcement
- [ ] Polish upgrade messaging
- [ ] Performance testing

## Notes for Mobile Team

### Key Changes:
1. **New data fields** in API responses (tier, can_enable, limits)
2. **New UI states** (locked features, upgrade prompts)
3. **New user flows** (upgrade paths, limit handling)

### Backward Compatibility:
- Existing free users will be limited to 3 favorites for alerts
- Existing VIP users (via Discord) need to be added to `vip_users` collection
- API changes are additive (new fields, not breaking changes)

### Error Handling:
- If tier detection fails, assume free user (safe default)
- If upgrade flow fails, maintain current tier state
- Log tier detection errors for debugging

---

**Last Updated:** 2026-03-25  
**Audience:** Mobile Development Team  
**Status:** Backend implementation in progress  
**Contact:** Backend Team for API questions