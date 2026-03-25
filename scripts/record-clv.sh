#!/usr/bin/env bash
# record-clv.sh — Record closing line value (CLV) for settled picks in ledger.json
#
# Run at settlement time (after games complete, before or alongside settle-picks.sh).
# CLV = our opening line − closing line (positive = we beat the market = good process)
#
# Usage:
#   ./scripts/record-clv.sh
#   (interactive — prompts for each unsettled pick's closing line)
#
# Or pipe in values:
#   echo "230.5" | ./scripts/record-clv.sh  (non-interactive)

set -euo pipefail

LEDGER="/Users/ellis/.openclaw/workspace/nba-analyzer/picks/ledger.json"

if ! command -v jq &>/dev/null; then
  echo "Error: jq is required. Install with: brew install jq" >&2
  exit 1
fi

# Show unsettled picks that need CLV recorded
echo ""
echo "=== CLV Recorder ==="
echo "Closing Line Value = your opening line − closing line"
echo "  Positive CLV = you beat the market (good process)"
echo "  Negative CLV = market moved against you (bad process)"
echo "  Target: avg CLV ≥ 0 across all picks"
echo ""

# Extract picks with null CLV (unsettled or missing closing line)
unsettled=$(jq -r '.picks[] | select(.closing_line == null and .result != null) | "\(.date) | \(.game) | \(.pick) | opened: \(.line) | result: \(.result)"' "$LEDGER")

if [ -z "$unsettled" ]; then
  echo "No picks with missing CLV data found."
  echo ""
  echo "=== Current CLV Summary ==="
  jq -r '
    [.picks[] | select(.clv != null)] |
    if length == 0 then "No CLV data recorded yet."
    else
      "Picks with CLV: \(length)",
      "Avg CLV: \((map(.clv) | add) / length | . * 100 | round | . / 100)",
      "",
      "By pick:",
      (.[] | "  \(.date) \(.pick): CLV=\(.clv) (opened \(.line), closed \(.closing_line))")
    end
  ' "$LEDGER"
  exit 0
fi

echo "Picks needing CLV data (result recorded but no closing line):"
echo "$unsettled"
echo ""
echo "For each pick, enter the closing line (what the line was at game time)."
echo "Press Enter to skip a pick."
echo ""

# Process each pick
while IFS= read -r line_info; do
  date=$(echo "$line_info" | cut -d'|' -f1 | xargs)
  game=$(echo "$line_info" | cut -d'|' -f2 | xargs)
  pick=$(echo "$line_info" | cut -d'|' -f3 | xargs)
  opened=$(echo "$line_info" | cut -d'|' -f4 | sed 's/opened: //' | xargs)
  result=$(echo "$line_info" | cut -d'|' -f5 | sed 's/result: //' | xargs)

  echo "Pick: [$date] $game — $pick"
  echo "  Opened at: $opened | Result: $result"
  read -r -p "  Closing line (Enter to skip): " closing

  if [ -z "$closing" ]; then
    echo "  Skipped."
    continue
  fi

  # Calculate CLV
  # For unders/totals: CLV = our line - closing line (positive = we got better number)
  # For spreads: CLV = closing line - our line (positive = line moved in our favor)
  # Detect if it's a spread or total based on pick type
  is_under=$(echo "$pick" | grep -i "under\|U[0-9]" | wc -l | xargs)
  is_over=$(echo "$pick" | grep -i "over\|O[0-9]" | wc -l | xargs)

  clv=$(echo "$opened - $closing" | bc 2>/dev/null || echo "null")

  echo "  CLV = $opened − $closing = $clv"
  if [ "$clv" != "null" ] && (( $(echo "$clv > 0" | bc -l) )); then
    echo "  ✅ Positive CLV — you beat the closing line (good process)"
  elif [ "$clv" != "null" ] && (( $(echo "$clv < 0" | bc -l) )); then
    echo "  ⚠️  Negative CLV — market moved against you"
  else
    echo "  ➖ Neutral CLV"
  fi

  # Update ledger.json using jq
  # Match by date + pick string
  tmp=$(mktemp)
  jq --arg date "$date" \
     --arg pick "$pick" \
     --argjson closing "$closing" \
     --argjson clv "$clv" \
     '(.picks[] | select(.date == $date and .pick == $pick)) |= . + {closing_line: $closing, clv: $clv}' \
     "$LEDGER" > "$tmp" && mv "$tmp" "$LEDGER"

  echo "  Saved to ledger."
  echo ""
done <<< "$unsettled"

echo ""
echo "=== Updated CLV Summary ==="
jq -r '
  [.picks[] | select(.clv != null)] |
  if length == 0 then "No CLV data recorded yet."
  else
    "Picks with CLV: \(length)",
    "Avg CLV: \((map(.clv) | add) / length | . * 100 | round | . / 100)",
    "",
    "Detail:",
    (.[] | "  \(.date) | \(.pick) | CLV=\(.clv) (W/L: \(.result // "pending"))")
  end
' "$LEDGER"
