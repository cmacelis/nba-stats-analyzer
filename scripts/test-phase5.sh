#!/bin/bash

# Phase 5 Test Script
# Tests personalized alert rules and Discord integration

set -e

API_BASE="${API_BASE_URL:-https://edgedetector.ai}"
TEST_USER="test_user_$(date +%s)"
LEAGUE="nba"
STAT="pts"

echo "🧪 Phase 5: Personalized Alert Rules Test Suite"
echo "================================================"
echo ""
echo "API Base: $API_BASE"
echo "Test User: $TEST_USER"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() {
  echo -e "${GREEN}✓${NC} $1"
}

fail() {
  echo -e "${RED}✗${NC} $1"
  exit 1
}

info() {
  echo -e "${YELLOW}ℹ${NC} $1"
}

# Test 1: Create alert rule
echo ""
info "Test 1: Create alert rule"
TRACK_RESPONSE=$(curl -s -X POST "$API_BASE/api/alerts/rules/track" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$TEST_USER'",
    "league": "'$LEAGUE'",
    "stat": "'$STAT'",
    "direction": "over",
    "minDelta": 2.0,
    "minMinutes": 20
  }')

RULE_ID=$(echo $TRACK_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$RULE_ID" ]; then
  fail "Failed to create rule: $TRACK_RESPONSE"
fi

pass "Rule created: $RULE_ID"
pass "Response: $TRACK_RESPONSE"

# Test 2: List alert rules
echo ""
info "Test 2: List alert rules for user"
LIST_RESPONSE=$(curl -s "$API_BASE/api/alerts/rules/list?userId=$TEST_USER")

if echo "$LIST_RESPONSE" | grep -q "$RULE_ID"; then
  pass "Rule appears in list"
  pass "Response: $LIST_RESPONSE"
else
  fail "Rule not found in list: $LIST_RESPONSE"
fi

# Test 3: Create rule with specific player
echo ""
info "Test 3: Create rule with specific player"
TRACK_RESPONSE2=$(curl -s -X POST "$API_BASE/api/alerts/rules/track" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$TEST_USER'",
    "league": "'$LEAGUE'",
    "stat": "pra",
    "direction": "under",
    "minDelta": 3.5,
    "minMinutes": 25,
    "playerId": 201950,
    "playerName": "LeBron James"
  }')

RULE_ID2=$(echo $TRACK_RESPONSE2 | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$RULE_ID2" ]; then
  fail "Failed to create second rule: $TRACK_RESPONSE2"
fi

pass "Second rule created: $RULE_ID2"

# Test 4: List rules again (should have 2)
echo ""
info "Test 4: Verify second rule in list"
LIST_RESPONSE2=$(curl -s "$API_BASE/api/alerts/rules/list?userId=$TEST_USER")

if echo "$LIST_RESPONSE2" | grep -q "$RULE_ID2"; then
  pass "Second rule appears in list"
  # Count rules
  RULE_COUNT=$(echo "$LIST_RESPONSE2" | grep -o '"id":"' | wc -l)
  pass "Total rules: $RULE_COUNT"
else
  fail "Second rule not found in list: $LIST_RESPONSE2"
fi

# Test 5: Delete first rule
echo ""
info "Test 5: Delete first rule"
DELETE_RESPONSE=$(curl -s -X DELETE "$API_BASE/api/alerts/rules/delete" \
  -H "Content-Type: application/json" \
  -d '{
    "ruleId": "'$RULE_ID'",
    "userId": "'$TEST_USER'"
  }')

if echo "$DELETE_RESPONSE" | grep -q '"success":true'; then
  pass "Rule deleted successfully"
else
  fail "Failed to delete rule: $DELETE_RESPONSE"
fi

# Test 6: Verify rule removed from list
echo ""
info "Test 6: Verify rule removed from list"
LIST_RESPONSE3=$(curl -s "$API_BASE/api/alerts/rules/list?userId=$TEST_USER")

if ! echo "$LIST_RESPONSE3" | grep -q "$RULE_ID"; then
  pass "Rule no longer in list"
else
  fail "Rule still appears in list: $LIST_RESPONSE3"
fi

# Test 7: Test invalid inputs
echo ""
info "Test 7: Test invalid inputs"

# Missing required field
INVALID_RESPONSE=$(curl -s -X POST "$API_BASE/api/alerts/rules/track" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$TEST_USER'",
    "league": "'$LEAGUE'"
  }')

if echo "$INVALID_RESPONSE" | grep -q '"error"'; then
  pass "Invalid input rejected"
else
  fail "Should reject invalid input: $INVALID_RESPONSE"
fi

# Test 8: Test unauthorized delete
echo ""
info "Test 8: Test unauthorized delete"
UNAUTH_DELETE=$(curl -s -X DELETE "$API_BASE/api/alerts/rules/delete" \
  -H "Content-Type: application/json" \
  -d '{
    "ruleId": "'$RULE_ID2'",
    "userId": "wrong_user"
  }')

if echo "$UNAUTH_DELETE" | grep -q '"error"'; then
  pass "Unauthorized delete rejected"
else
  fail "Should reject unauthorized delete: $UNAUTH_DELETE"
fi

# Cleanup: Delete remaining test rule
echo ""
info "Cleanup: Deleting remaining test rule"
curl -s -X DELETE "$API_BASE/api/alerts/rules/delete" \
  -H "Content-Type: application/json" \
  -d '{
    "ruleId": "'$RULE_ID2'",
    "userId": "'$TEST_USER'"
  }' > /dev/null

pass "Cleanup complete"

# Summary
echo ""
echo "================================================"
echo -e "${GREEN}All tests passed!${NC}"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Deploy to production (git push to main)"
echo "2. Test Discord bot commands in server"
echo "3. Monitor Firestore for rule creation/deletion"
echo "4. Run alert detection and verify DMs sent"