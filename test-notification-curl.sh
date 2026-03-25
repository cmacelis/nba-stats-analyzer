#!/bin/bash

# Test notification endpoints with proper JWT token
# First get a real token from the auth endpoint

BASE_URL="https://nba-stats-analyzer-chuers-projects.vercel.app/api"
TEST_EMAIL="test@example.com"

echo "=== Step 1: Get a real JWT token ==="
TOKEN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth-mobile/signin" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"direct\":true}")

echo "Response: $TOKEN_RESPONSE"

# Extract token from response
TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "ERROR: Could not get token"
  exit 1
fi

echo "Token: ${TOKEN:0:50}..."
echo ""

echo "=== Step 2: Test /api/notifications/register ==="
curl -X POST "${BASE_URL}/notifications/register" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"device_token":"ExpoPushToken[TestDevice123]","platform":"ios"}' \
  -w "\nStatus: %{http_code}\n"

echo ""
echo "=== Step 3: Test /api/notifications/preferences (GET) ==="
curl -X GET "${BASE_URL}/notifications/preferences" \
  -H "Authorization: Bearer ${TOKEN}" \
  -w "\nStatus: %{http_code}\n"

echo ""
echo "=== Step 4: Test /api/notifications/preferences (POST) ==="
curl -X POST "${BASE_URL}/notifications/preferences" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"saved_player_alerts":true,"daily_top_edge":false,"game_day_alerts":true}' \
  -w "\nStatus: %{http_code}\n"

echo ""
echo "=== Step 5: Verify other endpoints still work ==="
curl -s "${BASE_URL}/players?search=lebron" -w "Status: %{http_code}\n" | head -1
