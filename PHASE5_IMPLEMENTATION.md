# Phase 5: Personalized Alert Rules — Implementation Guide

**Status:** Core implementation complete  
**Date:** March 7, 2026  
**Goal:** Enable users to create personalized alert rules and receive targeted Discord DMs

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Edge Detection Pipeline                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────────┐
        │    /api/alerts/run-enhanced (Cron)     │
        │  - Detect edges (NBA/WNBA)             │
        │  - Filter by direction & delta         │
        │  - Check user alert rules              │
        │  - Store matches as pending alerts     │
        └────────────────────┬───────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Firestore      │
                    │ pending_alerts  │ ◄──── Alert Processor
                    │ alert_rules     │        polls every 30s
                    │                 │
                    └─────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │  Discord Bot (always) │
                  │  - Polls Firestore    │
                  │  - Sends user DMs     │
                  │  - Updates commands   │
                  └──────────────────────┘
                             │
                             ▼
                     🔔 User receives DM
```

---

## Components

### 1. API Endpoints

#### `/api/alerts/rules/track` (POST)
**Create a new alert rule**

```bash
curl -X POST https://edgedetector.ai/api/alerts/rules/track \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123456789",
    "league": "nba",
    "stat": "pts",
    "direction": "over",
    "minDelta": 2.0,
    "minMinutes": 20,
    "playerId": 201950,
    "playerName": "LeBron James"
  }'
```

**Response:**
```json
{
  "id": "rule_abc123",
  "success": true,
  "message": "Alert rule created successfully"
}
```

**Fields:**
- `userId`: Discord user ID (required)
- `league`: 'nba' | 'wnba' (required)
- `stat`: 'pts' | 'pra' (required)
- `direction`: 'over' | 'under' | 'both' (required)
- `minDelta`: Minimum delta threshold (required, > 0)
- `minMinutes`: Minimum minutes per game (optional, default: 20)
- `playerId`: Specific player ID (optional — tracks any player if omitted)
- `playerName`: Player name for display (optional)

---

#### `/api/alerts/rules/list?userId={discordUserId}` (GET)
**List user's alert rules**

```bash
curl "https://edgedetector.ai/api/alerts/rules/list?userId=123456789"
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "rules": [
    {
      "id": "rule_abc123",
      "userId": "123456789",
      "league": "nba",
      "stat": "pts",
      "direction": "over",
      "minDelta": 2.0,
      "minMinutes": 20,
      "playerId": 201950,
      "playerName": "LeBron James",
      "enabled": true,
      "createdAt": "2026-03-07T00:30:00Z",
      "lastTriggered": "2026-03-07T01:15:00Z"
    }
  ]
}
```

---

#### `/api/alerts/rules/delete` (DELETE)
**Remove an alert rule**

```bash
curl -X DELETE https://edgedetector.ai/api/alerts/rules/delete \
  -H "Content-Type: application/json" \
  -d '{
    "ruleId": "rule_abc123",
    "userId": "123456789"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Alert rule deleted successfully"
}
```

---

### 2. Discord Bot Commands

#### `/track`
**Create a new personalized alert**

```
/track league:nba stat:pts direction:over mindelta:2.0 minminutes:20 playerid:201950 playername:LeBron James
```

Options:
- `league`: NBA | WNBA (required)
- `stat`: Points (PTS) | Points+Rebounds+Assists (PRA) (required)
- `direction`: Over | Under | Both (required)
- `mindelta`: Min delta threshold (required)
- `minminutes`: Min minutes per game (optional, default: 20)
- `playerid`: Player ID (optional)
- `playername`: Player name (optional)

---

#### `/rules`
**List your alert rules**

```
/rules
```

Shows all active rules with:
- Rule ID
- Player (if specific)
- League & Stat
- Direction & Thresholds
- Creation date & last triggered

---

#### `/untrack`
**Remove an alert rule**

```
/untrack ruleid:rule_abc123
```

---

### 3. Firestore Collections

#### `alert_rules`
Stores user-defined alert rules.

```typescript
interface AlertRule {
  id: string;
  userId: string;
  league: 'nba' | 'wnba';
  playerId?: number;
  playerName?: string;
  stat: 'pts' | 'pra';
  direction: 'over' | 'under' | 'both';
  minDelta: number;
  minMinutes: number;
  enabled: boolean;
  createdAt: Date;
  lastTriggered?: Date;
}
```

---

#### `pending_alerts`
Temporary collection for alerts waiting to be sent to users.

```typescript
interface PendingAlert {
  id: string;
  userId: string;
  ruleId: string;
  playerName: string;
  teamAbbrev: string;
  stat: 'pts' | 'pra';
  delta: number;
  seasonAvg: number;
  recentAvg: number;
  direction: 'over' | 'under';
  minDelta: number;
  league: 'nba' | 'wnba';
  createdAt: Date;
  processed: boolean;
  processedAt?: Date;
}
```

---

## Deployment Checklist

### Backend (Vercel)
- [ ] Firebase credentials in `.env.local`
  - `FIREBASE_API_KEY`
  - `FIREBASE_AUTH_DOMAIN`
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_STORAGE_BUCKET`
  - `FIREBASE_MESSAGING_SENDER_ID`
  - `FIREBASE_APP_ID`

- [ ] Deploy new API endpoints
  ```bash
  npm run build
  # Vercel auto-deploys on git push to main
  ```

- [ ] Update alerts cron job to use `/api/alerts/run-enhanced?check_user_rules=true`

### Discord Bot
- [ ] Firebase credentials in `.env`
  - Same as above

- [ ] Restart Discord bot
  ```bash
  pkill -f "node.*discord-bot"
  cd discord-bot && ./start.sh
  ```

- [ ] Verify alert processor logs
  ```bash
  tail -f discord-bot/bot.log | grep "Alert Processor"
  ```

### Testing
- [ ] Create test alert rule via `/track` command
- [ ] Trigger edge detection (manual or wait for cron)
- [ ] Verify pending alert in Firestore
- [ ] Verify Discord bot sends DM
- [ ] List rules via `/rules` command
- [ ] Delete rule via `/untrack` command

---

## Testing Plan

### 1. Unit Tests

#### Alert Rule Matching
Test that edges match rules correctly:

```typescript
// Test case: over direction
const rule = { direction: 'over', minDelta: 2.0 };
const edge = { delta: 2.5 };
expect(matchesRule(edge, rule, 'pts')).toBe(true);

// Test case: under direction
const rule = { direction: 'under', minDelta: 2.0 };
const edge = { delta: -2.5 };
expect(matchesRule(edge, rule, 'pts')).toBe(true);

// Test case: both directions
const rule = { direction: 'both', minDelta: 2.0 };
const edge1 = { delta: 2.5 };
const edge2 = { delta: -2.5 };
expect(matchesRule(edge1, rule, 'pts')).toBe(true);
expect(matchesRule(edge2, rule, 'pts')).toBe(true);
```

### 2. Integration Tests

#### API Endpoint Tests
```bash
# Test track endpoint
curl -X POST https://edgedetector.ai/api/alerts/rules/track \
  -H "Content-Type: application/json" \
  -d '{"userId":"test123","league":"nba","stat":"pts","direction":"over","minDelta":2.0}'

# Test list endpoint
curl "https://edgedetector.ai/api/alerts/rules/list?userId=test123"

# Test delete endpoint
curl -X DELETE https://edgedetector.ai/api/alerts/rules/delete \
  -H "Content-Type: application/json" \
  -d '{"ruleId":"...","userId":"test123"}'
```

#### Discord Bot Tests
```bash
# In Discord server:
/track league:nba stat:pts direction:over mindelta:2.0
/rules
/untrack ruleid:<id_from_rules>
```

### 3. End-to-End Tests

1. **Create rule via Discord**
   - User: `/track league:nba stat:pts direction:over mindelta:2.0`
   - Verify rule created in Firestore

2. **Trigger alert detection**
   - Manually call `/api/alerts/run-enhanced?check_user_rules=true`
   - Verify pending alerts created

3. **Receive DM**
   - Discord bot processes pending alerts
   - User receives DM with edge details

4. **Manage rules**
   - `/rules` — lists created rule
   - `/untrack ruleid:...` — deletes rule
   - Verify deletion in Firestore

---

## Monitoring

### Firestore Queries

**Check pending alerts:**
```
Collection: pending_alerts
Filter: processed == false
Order by: createdAt (ascending)
```

**Check user rules:**
```
Collection: alert_rules
Filter: userId == "123456789"
Order by: createdAt (descending)
```

**Check alert history:**
```
Collection: alert_rules
Filter: lastTriggered != null
Order by: lastTriggered (descending)
```

### Discord Bot Logs

```bash
# Watch alert processor
tail -f discord-bot/bot.log | grep "Alert Processor"

# Watch command execution
tail -f discord-bot/bot.log | grep "Command:"
```

---

## Troubleshooting

### Rules not triggering
1. Check Firestore `alert_rules` collection exists
2. Verify rule is enabled: `enabled == true`
3. Check that edges are being detected: `/api/edge?stat=pts`
4. Verify direction & minDelta thresholds match edges
5. Check alert processor logs in Discord bot

### DMs not received
1. User has DMs disabled → show warning in bot
2. Discord bot not running → restart with `./start.sh`
3. Alert processor errors → check logs
4. User not found → check userId is correct Discord ID

### Rules not saved
1. Firebase credentials missing in `.env`
2. Firestore security rules blocking writes
3. Network error → check error logs in API

---

## Next Steps

- [ ] Deploy to production
- [ ] Run full test suite
- [ ] Monitor Firestore usage (free tier limit: 50k reads/day)
- [ ] Gather user feedback
- [ ] Consider Phase 6: Rule analytics & trending stats
