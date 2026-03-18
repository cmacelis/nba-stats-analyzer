#!/usr/bin/env bash
# Smoke test — verifies the NBA Edge Detector API is routing correctly.
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

echo "────────────────────────────────────────────────────"
echo "  Passed: $PASS  |  Failed: $FAIL"
echo ""
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
