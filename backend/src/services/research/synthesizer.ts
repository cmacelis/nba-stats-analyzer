/**
 * Research Synthesizer
 * Uses Claude AI to synthesize recent form + variance into actionable prop edges.
 *
 * Key insight from backtesting: the prop line IS the season average.
 * Saying "he averages 24pts → OVER" is not an edge. We look for:
 *   - Recent form deviating from the line (last 5 vs season avg)
 *   - Consistency / variance (std dev determines confidence)
 *   - Over hit rate (% of recent games where actual > line)
 *   - Streak direction
 */
import axios from 'axios';
import { SocialMention } from './scraper';
import { SentimentScore } from './sentiment';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StatContext {
  propLine: number;       // season avg = proxy for the betting line
  recentAvg5: number;     // average of last 5 qualifying games
  recentAvg10: number;    // average of last 10 qualifying games
  stdDev: number;         // standard deviation of last 10 games (consistency)
  overHitRate: number;    // fraction of last 10 games where actual > propLine (0–1)
  streak: number;         // +N = N consecutive overs, -N = N consecutive unders
  recentGames: number[];  // last 10 values, most recent first
  gamesPlayed: number;    // total season games played
}

export interface ResearchReport {
  playerName: string;
  propType: 'points' | 'rebounds' | 'assists' | 'combined';
  prediction: 'over' | 'under' | 'neutral';
  confidence: number;     // 0–1
  reasoning: string;
  keyFactors: string[];
  sentimentWeight: string;
  statWeight: string;
  generatedAt: Date;
  expiresAt: Date;
  simulated: boolean;
}

// ── Cache ─────────────────────────────────────────────────────────────────────

const reportCache = new Map<string, ResearchReport>();

function cacheKey(playerName: string, propType: string) {
  return `${playerName.toLowerCase()}:${propType}`;
}

// ── Claude caller ─────────────────────────────────────────────────────────────

async function callClaude(prompt: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        timeout: 30000,
      }
    );
    const block = res.data?.content?.[0];
    return block?.type === 'text' ? block.text : null;
  } catch (err) {
    console.error('[synthesizer] Claude API error:', (err as Error).message);
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function r1(n: number) {
  return Math.round(n * 10) / 10;
}

function sign(n: number) {
  return n >= 0 ? `+${r1(n)}` : `${r1(n)}`;
}

function consistencyLabel(stdDev: number) {
  if (stdDev < 3) return 'very consistent';
  if (stdDev < 5) return 'consistent';
  if (stdDev < 7) return 'moderate variance';
  if (stdDev < 10) return 'high variance';
  return 'very high variance';
}

function streakLabel(streak: number) {
  if (streak === 0) return 'No active streak';
  const dir = streak > 0 ? 'OVER' : 'UNDER';
  return `${Math.abs(streak)} consecutive ${dir}s`;
}

// ── Simulated fallback (no Claude) ────────────────────────────────────────────

function simulatedReport(
  playerName: string,
  propType: string,
  sentiment: SentimentScore | null,
  ctx: StatContext | null
): ResearchReport {
  let prediction: 'over' | 'under' | 'neutral' = 'neutral';
  let confidence = 0.50;

  if (ctx && ctx.gamesPlayed >= 5) {
    const delta5  = ctx.recentAvg5  - ctx.propLine;
    const hitRate = ctx.overHitRate;

    // Edge signals: recent avg deviation + hit rate
    const overSignal  = delta5 > 1.5 && hitRate >= 0.6;
    const underSignal = delta5 < -1.5 && hitRate <= 0.4;

    if (overSignal) {
      prediction = 'over';
      confidence = Math.min(0.72, 0.55 + Math.abs(delta5) * 0.03 + (hitRate - 0.5) * 0.3);
    } else if (underSignal) {
      prediction = 'under';
      confidence = Math.min(0.72, 0.55 + Math.abs(delta5) * 0.03 + (0.5 - hitRate) * 0.3);
    } else {
      // Small sentiment nudge only if no stat signal
      const score = sentiment?.overall_score ?? 0;
      if (Math.abs(score) > 0.15) {
        prediction = score > 0 ? 'over' : 'under';
        confidence = 0.50 + Math.abs(score) * 0.15;
      }
    }

    // Penalise high variance
    if (ctx.stdDev > 7) confidence = Math.max(0.45, confidence - 0.08);
  } else {
    // No stat context — use pure sentiment
    const score = sentiment?.overall_score ?? 0;
    if (Math.abs(score) > 0.15) {
      prediction = score > 0 ? 'over' : 'under';
      confidence = 0.50 + Math.abs(score) * 0.2;
    }
  }

  const now = new Date();
  const factors: string[] = [];
  if (ctx) {
    factors.push(`L5 avg: ${r1(ctx.recentAvg5)} vs line ${r1(ctx.propLine)} (${sign(ctx.recentAvg5 - ctx.propLine)})`);
    factors.push(`Over hit rate L10: ${Math.round(ctx.overHitRate * 100)}%`);
    factors.push(`Consistency: ${consistencyLabel(ctx.stdDev)} (σ=${r1(ctx.stdDev)})`);
    factors.push(streakLabel(ctx.streak));
  }

  return {
    playerName,
    propType: propType as ResearchReport['propType'],
    prediction,
    confidence,
    reasoning: ctx
      ? `Simulated: L5 avg ${r1(ctx.recentAvg5)} vs line ${r1(ctx.propLine)} (${sign(ctx.recentAvg5 - ctx.propLine)}), hit rate ${Math.round(ctx.overHitRate * 100)}% over last 10.`
      : `Simulated: insufficient data for ${playerName} ${propType}.`,
    keyFactors: factors,
    sentimentWeight: 'Low (10%)',
    statWeight: 'Primary (90%)',
    generatedAt: now,
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    simulated: true,
  };
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(
  playerName: string,
  propType: string,
  ctx: StatContext | null,
  sentiment: SentimentScore | null,
  mentions: SocialMention[]
): string {
  const sentimentText = sentiment
    ? `Score: ${(sentiment.overall_score * 100).toFixed(0)}% positive | Volume: ${sentiment.volume} | Keywords: ${sentiment.keywords.join(', ')}`
    : 'No sentiment data';
  const topMentions = mentions.slice(0, 5).map(m => `- ${m.content} (${m.source})`).join('\n');

  if (!ctx || ctx.gamesPlayed < 3) {
    return `You are an expert NBA prop betting analyst.

**Player:** ${playerName}
**Prop:** ${propType}

Insufficient recent game data to analyze. Social sentiment: ${sentimentText}

Respond ONLY with valid JSON (no markdown):
{"prediction":"neutral","confidence":40,"reasoning":"Insufficient data for ${playerName} ${propType} analysis.","key_factors":["No recent game data available"],"sentiment_weight":"N/A","stat_weight":"N/A"}`;
  }

  const delta5  = r1(ctx.recentAvg5  - ctx.propLine);
  const delta10 = r1(ctx.recentAvg10 - ctx.propLine);

  const gameResultLine = ctx.recentGames
    .slice(0, 10)
    .map(v => {
      const d = v - ctx.propLine;
      const tag = Math.abs(d) < 0.5 ? '=' : d > 0 ? '↑' : '↓';
      return `${v}${tag}`;
    })
    .join(', ');

  return `You are an expert NBA prop betting analyst focused on finding edges, NOT confirming averages.

**Player:** ${playerName}
**Prop:** ${propType}
**Prop line:** ${r1(ctx.propLine)}  ← books set this AT the season average

⚠️  CRITICAL RULE: The line already prices in the season average. "He averages X so OVER X" is NOT an edge.
    You need a REASON the near-term outcome deviates from the long-run mean.

━━ Statistical Context ━━
Last 10 game results (most recent first):  ${gameResultLine}
  ↑ = over line, ↓ = under line, = push

Over hit rate (L10):  ${Math.round(ctx.overHitRate * 100)}%  (${Math.round(ctx.overHitRate * 10)}/10 overs)
Last  5-game avg:     ${r1(ctx.recentAvg5)}  (${sign(delta5)} vs line)
Last 10-game avg:     ${r1(ctx.recentAvg10)}  (${sign(delta10)} vs line)
Std dev (L10):        ${r1(ctx.stdDev)}  — ${consistencyLabel(ctx.stdDev)}
Current streak:       ${streakLabel(ctx.streak)}
Season games played:  ${ctx.gamesPlayed}

━━ Social sentiment ━━
${sentimentText}
${topMentions || 'No mentions available'}

━━ Decision framework ━━
Strong OVER signal:   L5 avg ≥ 2 above line AND hit rate ≥ 60%
Strong UNDER signal:  L5 avg ≤ 2 below line AND hit rate ≤ 40%
Momentum signal:      Streak of 3+ backed by avg deviation (not standalone)
Reduce confidence:    Std dev > 7 (high variance = hard to predict)
NEUTRAL:              Signals conflict, weak, or no sustained deviation (< 1.5 above/below line)

Confidence calibration:
- 55–65%: Moderate edge (one strong signal)
- 65–75%: Clear edge (multiple aligned signals)
- >75%:   Only if all signals strongly agree AND variance is low

Respond ONLY with valid JSON (no markdown):
{"prediction":"over"|"under"|"neutral","confidence":0-100,"reasoning":"<2-3 sentences citing specific numbers>","key_factors":["..."],"sentiment_weight":"<e.g. Low (10%)>","stat_weight":"<e.g. Primary (90%)>"}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generateReport(
  playerName: string,
  propType: string,
  mentions: SocialMention[],
  sentiment: SentimentScore | null,
  statContext: StatContext | null
): Promise<ResearchReport> {
  // Return cached if still valid
  const key = cacheKey(playerName, propType);
  const cached = reportCache.get(key);
  if (cached && cached.expiresAt > new Date()) return cached;

  const prompt = buildPrompt(playerName, propType, statContext, sentiment, mentions);
  const text = await callClaude(prompt);

  if (!text) {
    const report = simulatedReport(playerName, propType, sentiment, statContext);
    reportCache.set(key, report);
    return report;
  }

  try {
    const match = text.match(/\{[\s\S]*\}/);
    const json = JSON.parse(match ? match[0] : text);
    const now = new Date();
    const report: ResearchReport = {
      playerName,
      propType: propType as ResearchReport['propType'],
      prediction: json.prediction || 'neutral',
      confidence: Math.min(1, (json.confidence || 50) / 100),
      reasoning: json.reasoning || 'Analysis unavailable',
      keyFactors: json.key_factors || [],
      sentimentWeight: json.sentiment_weight || 'Low (10%)',
      statWeight: json.stat_weight || 'Primary (90%)',
      generatedAt: now,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      simulated: false,
    };
    reportCache.set(key, report);
    return report;
  } catch {
    const report = simulatedReport(playerName, propType, sentiment, statContext);
    reportCache.set(key, report);
    return report;
  }
}

export function getCachedReport(playerName: string, propType: string): ResearchReport | null {
  const cached = reportCache.get(cacheKey(playerName, propType));
  return cached && cached.expiresAt > new Date() ? cached : null;
}

export function clearCache() {
  reportCache.clear();
}
