#!/usr/bin/env bash
# Smoke test — verifies the EdgeDetector.ai API is routing correctly.
# Run: bash frontend/scripts/smoke-test.sh [optional-base-url]
#
# If no URL is provided, tests the production deployment.
# Pass a deployment-specific URL to test a preview:
#   bash frontend/scripts/smoke-test.sh https://nba-stats-analyzer-abc123-chuers-projects.vercel.app

BASE="${1:-https://nba-stats-analyzer-chuers-projects.vercel.app}"
PASS=0; FAIL=0

check() {
  local label="$1" url="$2" expect="$3"
  local body; body=$(curl -sf "$url" 2>/dev/null)
  if echo "$body" | grep -q "$expect"; then
    echo "  ✓  $label"
    ((PASS++))
  else
    echo "  ✗  $label"
    echo "     URL: $url"
    echo "     Expected to contain: $expect"
    echo "     Got: ${body:0:120}"
    ((FAIL++))
  fi
}

echo ""
echo "Smoke-testing: $BASE"
echo "────────────────────────────────────────────────────"

# 1. Health check
check "Health endpoint returns JSON"             "$BASE/api/health"                             '"status":"ok"'

# 2. Player search — must return JSON, not HTML
check "Player search returns JSON"               "$BASE/api/players?search=LeBron"              '"id"'

# 3. Compare endpoint — the historically broken route
check "Compare endpoint returns player stats"    "$BASE/api/players/compare/115/237?season=2025" '"pts"'

# 4. Verify compare is NOT returning HTML (old routing bug)
body=$(curl -sf "$BASE/api/players/compare/115/237?season=2025" 2>/dev/null)
if echo "$body" | grep -qi "<!doctype"; then
  echo "  ✗  Compare endpoint must NOT return HTML (routing bug!)"
  ((FAIL++))
else
  echo "  ✓  Compare endpoint returns JSON, not HTML"
  ((PASS++))
fi

# 5. SPA fallback — follow redirects, accept 401 (Vercel auth on preview URLs)
body=$(curl -sL "$BASE/compare" 2>/dev/null)
if echo "$body" | grep -qi "<!doctype\|Authentication Required"; then
  echo "  ✓  SPA fallback is active for /compare"
  ((PASS++))
else
  echo "  ✗  SPA fallback not working for /compare"
  echo "     Got: ${body:0:120}"
  ((FAIL++))
fi

echo ""
echo "── /api/nba/* aliases ───────────────────────────────"

# 6. /api/nba/players — league-aware alias
check "/api/nba/players search returns JSON"         "$BASE/api/nba/players?search=LeBron"                '"id"'

# 7. /api/nba/games
check "/api/nba/games returns data array"            "$BASE/api/nba/games"                                '"data"'

# 8. /api/nba/edge
check "/api/nba/edge returns edge feed"              "$BASE/api/nba/edge?stat=pts&season=2025"             '"data"'

# 9. /api/nba/players/compare — league-aware alias
check "/api/nba/players/compare returns stats"       "$BASE/api/nba/players/compare/115/237?season=2025"  '"pts"'

# 10. /api/nba/players/photo
check "/api/nba/players/photo returns photo_url"     "$BASE/api/nba/players/photo?name=LeBron%20James"    '"photo_url"'

# 11. /api/nba/players/compare must NOT return HTML
body=$(curl -sf "$BASE/api/nba/players/compare/115/237?season=2025" 2>/dev/null)
if echo "$body" | grep -qi "<!doctype"; then
  echo "  ✗  /api/nba/players/compare must NOT return HTML"
  ((FAIL++))
else
  echo "  ✓  /api/nba/players/compare returns JSON, not HTML"
  ((PASS++))
fi

echo "────────────────────────────────────────────────────"
echo "  Passed: $PASS  |  Failed: $FAIL"
echo ""
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
