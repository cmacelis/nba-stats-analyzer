#!/usr/bin/env bash
set -euo pipefail

BASE="https://nba-stats-analyzer-chuers-projects.vercel.app"

echo "health:"
curl -s "$BASE/api/health" | head -120
echo

echo "players:"
curl -s "$BASE/api/players?search=lebron" | head -120
echo

echo "games:"
curl -s "$BASE/api/games" | head -60
echo

echo "edge count:"
curl -s "$BASE/api/edge?stat=pts&min_minutes=20&season=2025" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',[])))"
