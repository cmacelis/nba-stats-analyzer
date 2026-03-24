#!/bin/bash
# Test script for notification endpoints

BASE_URL="https://nba-stats-analyzer-chuers-projects.vercel.app/api/notifications"
# For local testing: BASE_URL="http://localhost:3000/api/notifications"

echo "=== Testing Notification Endpoints ==="
echo "Base URL: $BASE_URL"
echo ""

# Test 1: Get preferences (requires auth)
echo "Test 1: GET /preferences (requires auth)"
echo "Note: This requires a valid session token"
echo ""

# Test 2: Update preferences (requires auth)
echo "Test 2: POST /preferences (requires auth)"
echo "Example curl command (with placeholder token):"
echo "curl -X POST '$BASE_URL/preferences' \\"
echo "  -H 'Authorization: Bearer YOUR_SESSION_TOKEN' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"saved_player_alerts\": true, \"daily_top_edge\": false, \"game_day_alerts\": false}'"
echo ""

# Test 3: Register device token (requires auth)
echo "Test 3: POST /register (requires auth)"
echo "Example curl command (with placeholder token):"
echo "curl -X POST '$BASE_URL/register' \\"
echo "  -H 'Authorization: Bearer YOUR_SESSION_TOKEN' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"device_token\": \"ExpoPushToken[TEST123456789]\", \"platform\": \"ios\"}'"
echo ""

echo "=== Firestore Collections Required ==="
echo ""
echo "1. device_tokens collection"
echo "   Fields: id, user_email, device_token, platform, created_at, updated_at"
echo ""
echo "2. alert_preferences collection"
echo "   Fields: id, user_email, saved_player_alerts, daily_top_edge, game_day_alerts, created_at, updated_at"
echo ""
echo "=== Environment Variables Required ==="
echo ""
echo "Make sure these are set in Vercel:"
echo "- FIREBASE_PROJECT_ID"
echo "- FIREBASE_API_KEY"
echo ""
echo "=== Testing Steps ==="
echo ""
echo "1. Deploy to Vercel"
echo "2. Create Firestore collections manually or via script"
echo "3. Get a valid session token from /api/auth-mobile/signin"
echo "4. Test endpoints with the curl commands above"
echo "5. Check Vercel logs for any errors"