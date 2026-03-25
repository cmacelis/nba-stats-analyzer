#!/bin/bash

BASE_URL="https://nba-stats-analyzer-chuers-projects.vercel.app/api"
TEST_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RAdXNlci5jb20iLCJpYXQiOjE3NDI4NDgwMDAsImV4cCI6MTc0MzQ1MjgwMH0.test-signature-do-not-use-in-production"

echo "=== Testing Notification Endpoints ==="
echo "Base URL: $BASE_URL"
echo ""

# Test 1: POST /api/notifications/register
echo "1. Testing POST /api/notifications/register"
curl -s -X POST "$BASE_URL/notifications/register" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"device_token":"ExpoPushToken[TestDeviceToken123]","platform":"ios"}' \
  -w "\nStatus: %{http_code}\n\n"

# Test 2: GET /api/notifications/preferences
echo "2. Testing GET /api/notifications/preferences"
curl -s "$BASE_URL/notifications/preferences" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -w "\nStatus: %{http_code}\n\n"

# Test 3: POST /api/notifications/preferences
echo "3. Testing POST /api/notifications/preferences"
curl -s -X POST "$BASE_URL/notifications/preferences" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"saved_player_alerts":true,"daily_top_edge":false,"game_day_alerts":true}' \
  -w "\nStatus: %{http_code}\n\n"

echo "=== Tests Complete ==="