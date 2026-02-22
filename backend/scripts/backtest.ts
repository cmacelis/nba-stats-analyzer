/**
 * NBA Prop Backtesting Pipeline
 *
 * Validates Phase 2 AI predictions against real game logs.
 * - Fetches last 20 games per player from BallDontLie
 * - Uses season average as the prop line proxy
 * - Calls GET /api/research/:player?prop=... for predictions
 * - Outputs backtest-results.csv + backtest-summary.json
 *
 * Usage: ts-node scripts/backtest.ts
 */

import 'dotenv/config';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// ── Config ────────────────────────────────────────────────────────────────────

const BDL_KEY = process.env.BALL_DONT_LIE_API_KEY!;
const RESEARCH_BASE = 'http://localhost:3000/api/research';
const BDL_BASE = 'https://api.balldontlie.io/v1';
const SEASON = 2024;
const GAMES_PER_PLAYER = 20;
const REQUEST_DELAY_MS = 600; // stay under BDL rate limit

const TOP_PLAYERS: Array<{ name: string; bdlId: number }> = [
  { name: 'LeBron James',            bdlId: 237 },
  { name: 'Stephen Curry',           bdlId: 115 },
  { name: 'Nikola Jokic',            bdlId: 246 },
  { name: 'Luka Doncic',             bdlId: 132 },
  { name: 'Jayson Tatum',            bdlId: 434 },
  { name: 'Anthony Davis',           bdlId: 117 },
  { name: 'Kevin Durant',            bdlId: 140 },
  { name: 'Shai Gilgeous-Alexander', bdlId: 175 },
  { name: 'Giannis Antetokounmpo',   bdlId: 15  },
  { name: 'Joel Embiid',             bdlId: 145 },
];

const PROP_TYPES = ['points', 'rebounds', 'assists'] as const;
type PropType = typeof PROP_TYPES[number];

const PROP_STAT_KEY: Record<PropType, 'pts' | 'reb' | 'ast'> = {
  points:   'pts',
  rebounds: 'reb',
  assists:  'ast',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface GameLog {
  pts: number;
  reb: number;
  ast: number;
  date: string;
  min: string;
}

interface SeasonAvg {
  pts: number;
  reb: number;
  ast: number;
}

interface ResearchPrediction {
  prediction: 'over' | 'under' | 'neutral';
  confidence: number;
  simulated: boolean;
}

interface BacktestRow {
  player: string;
  prop_type: PropType;
  game_date: string;
  line: number;
  actual_result: number;
  over_under_actual: 'over' | 'under' | 'push';
  prediction: string;
  confidence: number;
  correct: boolean | null;
  roi: number;
  simulated: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// ── BDL Fetchers ──────────────────────────────────────────────────────────────

async function fetchGameLogs(bdlId: number): Promise<GameLog[]> {
  try {
    const res = await axios.get(`${BDL_BASE}/stats`, {
      params: {
        'player_ids[]': bdlId,
        'seasons[]': SEASON,
        per_page: GAMES_PER_PLAYER,
        sort: 'date',
        direction: 'desc',
      },
      headers: { Authorization: BDL_KEY },
      timeout: 10000,
    });
    return (res.data?.data ?? []).map((g: Record<string, unknown>) => ({
      pts: Number(g.pts) || 0,
      reb: Number(g.reb) || 0,
      ast: Number(g.ast) || 0,
      min: String(g.min || '0'),
      date: (g.game as Record<string, string>)?.date?.split('T')[0] || 'unknown',
    }));
  } catch (err) {
    console.warn(`  ⚠ Failed to fetch game logs: ${(err as Error).message}`);
    return [];
  }
}

async function fetchSeasonAvg(bdlId: number): Promise<SeasonAvg | null> {
  try {
    const res = await axios.get(`${BDL_BASE}/season_averages`, {
      params: { player_id: bdlId, season: SEASON },
      headers: { Authorization: BDL_KEY },
      timeout: 10000,
    });
    const row = res.data?.data?.[0];
    if (!row) return null;
    return {
      pts: Number(row.pts) || 0,
      reb: Number(row.reb) || 0,
      ast: Number(row.ast) || 0,
    };
  } catch (err) {
    console.warn(`  ⚠ Failed to fetch season avg: ${(err as Error).message}`);
    return null;
  }
}

// ── Research API ──────────────────────────────────────────────────────────────

async function fetchPrediction(
  playerName: string,
  prop: PropType
): Promise<ResearchPrediction | null> {
  try {
    const res = await axios.get(
      `${RESEARCH_BASE}/${encodeURIComponent(playerName)}`,
      { params: { prop }, timeout: 45000 }
    );
    return {
      prediction: res.data.prediction,
      confidence: res.data.confidence,
      simulated: res.data.simulated ?? true,
    };
  } catch (err) {
    console.warn(`  ⚠ Research API error for ${playerName}/${prop}: ${(err as Error).message}`);
    return null;
  }
}

// ── ROI Simulation ────────────────────────────────────────────────────────────
// Standard -110 vig: bet 1.1 to win 1.0 (profit = 1 on win, loss = 1.1 on loss)

function calcROI(correct: boolean | null): number {
  if (correct === null) return 0;   // neutral = no bet
  if (correct === true) return 1.0; // win
  return -1.1;                      // loss
}

// ── Report Writers ────────────────────────────────────────────────────────────

function writeCSV(rows: BacktestRow[], outPath: string): void {
  const headers = [
    'player', 'prop_type', 'game_date', 'line', 'actual_result',
    'over_under_actual', 'prediction', 'confidence', 'correct', 'roi', 'simulated',
  ];
  const lines = [
    headers.join(','),
    ...rows.map(r =>
      [
        `"${r.player}"`,
        r.prop_type,
        r.game_date,
        r.line,
        r.actual_result,
        r.over_under_actual,
        r.prediction,
        r.confidence.toFixed(2),
        r.correct === null ? 'neutral' : r.correct,
        r.roi.toFixed(2),
        r.simulated,
      ].join(',')
    ),
  ];
  fs.writeFileSync(outPath, lines.join('\n'));
}

function buildSummary(rows: BacktestRow[]) {
  const bettable = rows.filter(r => r.prediction !== 'neutral');
  const wins     = bettable.filter(r => r.correct === true);
  const totalROI = rows.reduce((s, r) => s + r.roi, 0);

  const byProp = Object.fromEntries(
    PROP_TYPES.map(prop => {
      const subset = bettable.filter(r => r.prop_type === prop);
      const w = subset.filter(r => r.correct === true).length;
      return [
        prop,
        {
          bets: subset.length,
          wins: w,
          winRate: subset.length > 0 ? round2((w / subset.length) * 100) : 0,
          roi: round2(subset.reduce((s, r) => s + r.roi, 0)),
        },
      ];
    })
  );

  // Confidence calibration: group predictions into buckets
  const buckets: Record<string, { total: number; correct: number }> = {
    '45-55%': { total: 0, correct: 0 },
    '55-65%': { total: 0, correct: 0 },
    '65-75%': { total: 0, correct: 0 },
    '75%+':   { total: 0, correct: 0 },
  };
  for (const r of bettable) {
    const pct = r.confidence * 100;
    const bucket =
      pct < 55 ? '45-55%' :
      pct < 65 ? '55-65%' :
      pct < 75 ? '65-75%' : '75%+';
    buckets[bucket].total++;
    if (r.correct) buckets[bucket].correct++;
  }
  const calibration = Object.fromEntries(
    Object.entries(buckets).map(([k, v]) => [
      k,
      { ...v, actualRate: v.total > 0 ? round2((v.correct / v.total) * 100) : 0 },
    ])
  );

  const overallWinRate = bettable.length > 0
    ? round2((wins.length / bettable.length) * 100)
    : 0;

  const simulatedFraction = round2(
    rows.filter(r => r.simulated).length / rows.length
  );

  // Break-even at -110 is 52.38%
  const breakEven = 52.38;
  const recommendation =
    overallWinRate >= breakEven + 5 ? 'STRONG - Edge exists above vig'
    : overallWinRate >= breakEven   ? 'MARGINAL - Near break-even, monitor'
    : 'BELOW_BREAK_EVEN - Predictions not profitable at current accuracy';

  return {
    totalGames:    rows.length,
    totalBets:     bettable.length,
    neutralSkipped: rows.length - bettable.length,
    overallWinRate,
    totalROI:      round2(totalROI),
    breakEven,
    byProp,
    calibration,
    simulatedFraction,
    recommendation,
    note: simulatedFraction > 0.5
      ? 'WARN: Majority of predictions are SIMULATED (no ANTHROPIC_API_KEY or Claude unavailable). Results reflect sentiment heuristic, not true LLM analysis.'
      : 'Predictions generated by Claude AI.',
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('━━━ NBA Prop Backtesting Pipeline ━━━');
  console.log(`Players: ${TOP_PLAYERS.length} | Props: ${PROP_TYPES.join(', ')} | Games/player: ${GAMES_PER_PLAYER}\n`);

  const allRows: BacktestRow[] = [];

  for (const { name, bdlId } of TOP_PLAYERS) {
    console.log(`\n▸ ${name} (BDL ID: ${bdlId})`);

    // 1. Fetch game logs
    const logs = await fetchGameLogs(bdlId);
    await sleep(REQUEST_DELAY_MS);

    if (logs.length === 0) {
      console.log('  No game logs found, skipping.');
      continue;
    }
    console.log(`  Games fetched: ${logs.length}`);

    // 2. Fetch season averages (used as the prop line proxy)
    const avg = await fetchSeasonAvg(bdlId);
    await sleep(REQUEST_DELAY_MS);

    if (!avg) {
      console.log('  No season averages, skipping.');
      continue;
    }
    console.log(`  Season avg — pts: ${avg.pts}, reb: ${avg.reb}, ast: ${avg.ast}`);

    // 3. Get research predictions (one per prop type, cached after first call)
    const predictions: Partial<Record<PropType, ResearchPrediction>> = {};
    for (const prop of PROP_TYPES) {
      process.stdout.write(`  Fetching prediction: ${prop}... `);
      const pred = await fetchPrediction(name, prop);
      if (pred) {
        predictions[prop] = pred;
        console.log(`${pred.prediction.toUpperCase()} (conf: ${(pred.confidence * 100).toFixed(0)}%${pred.simulated ? ', simulated' : ''})`);
      } else {
        console.log('failed');
      }
      await sleep(REQUEST_DELAY_MS);
    }

    // 4. Build backtest rows for each game × prop
    for (const log of logs) {
      // Skip garbage-time games (under 10 minutes played)
      const minPlayed = parseInt(log.min) || 0;
      if (minPlayed < 10) continue;

      for (const prop of PROP_TYPES) {
        const pred = predictions[prop];
        if (!pred) continue;

        const statKey = PROP_STAT_KEY[prop];
        const line        = round2(avg[statKey]);
        const actual      = log[statKey];
        const diff        = actual - line;
        const actualDir: 'over' | 'under' | 'push' =
          Math.abs(diff) < 0.5 ? 'push' : diff > 0 ? 'over' : 'under';

        // correct = prediction direction matches actual direction (push = no winner)
        let correct: boolean | null = null;
        if (pred.prediction !== 'neutral' && actualDir !== 'push') {
          correct = pred.prediction === actualDir;
        }

        allRows.push({
          player:            name,
          prop_type:         prop,
          game_date:         log.date,
          line,
          actual_result:     actual,
          over_under_actual: actualDir,
          prediction:        pred.prediction,
          confidence:        pred.confidence,
          correct,
          roi:               calcROI(correct),
          simulated:         pred.simulated,
        });
      }
    }
  }

  if (allRows.length === 0) {
    console.error('\n✗ No rows generated. Check API connectivity.');
    process.exit(1);
  }

  // 5. Write outputs
  const outDir = path.join(__dirname, '..', '..', 'backtest-output');
  fs.mkdirSync(outDir, { recursive: true });

  const csvPath  = path.join(outDir, 'backtest-results.csv');
  const jsonPath = path.join(outDir, 'backtest-summary.json');

  writeCSV(allRows, csvPath);
  const summary = buildSummary(allRows);
  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));

  // 6. Print summary
  console.log('\n━━━ Results ━━━');
  console.log(`Total game×prop rows: ${summary.totalGames}`);
  console.log(`Bets placed (non-neutral): ${summary.totalBets}`);
  console.log(`Overall win rate: ${summary.overallWinRate}% (break-even: ${summary.breakEven}%)`);
  console.log(`Total ROI (units): ${summary.totalROI > 0 ? '+' : ''}${summary.totalROI}`);
  console.log('\nBy prop type:');
  for (const [prop, stats] of Object.entries(summary.byProp)) {
    const roi = (stats as { roi: number }).roi;
    const wr  = (stats as { winRate: number }).winRate;
    const b   = (stats as { bets: number }).bets;
    console.log(`  ${prop.padEnd(12)} win rate: ${wr}%  ROI: ${roi >= 0 ? '+' : ''}${roi}  (${b} bets)`);
  }
  console.log('\nConfidence calibration:');
  for (const [bucket, data] of Object.entries(summary.calibration)) {
    const d = data as { actualRate: number; total: number };
    console.log(`  ${bucket.padEnd(10)} actual hit rate: ${d.actualRate}%  (n=${d.total})`);
  }
  console.log(`\n⚑  ${summary.recommendation}`);
  if (summary.note.startsWith('WARN')) console.log(`⚠  ${summary.note}`);
  console.log(`\nOutputs written to: ${outDir}/`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
