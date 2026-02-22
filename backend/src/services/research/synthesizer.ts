/**
 * Research Synthesizer
 * Uses Claude AI to synthesize social sentiment + stats into betting insights
 */
import axios from 'axios';
import { SocialMention } from './scraper';
import { SentimentScore } from './sentiment';

export interface ResearchReport {
  playerName: string;
  propType: 'points' | 'rebounds' | 'assists' | 'combined';
  prediction: 'over' | 'under' | 'neutral';
  confidence: number;        // 0–1
  reasoning: string;
  keyFactors: string[];
  sentimentWeight: string;
  statWeight: string;
  generatedAt: Date;
  expiresAt: Date;
  simulated: boolean;
}

// In-memory report cache: "playerName:propType" → ResearchReport
const reportCache = new Map<string, ResearchReport>();

function cacheKey(playerName: string, propType: string) {
  return `${playerName.toLowerCase()}:${propType}`;
}

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

function simulatedReport(
  playerName: string,
  propType: string,
  sentiment: SentimentScore | null
): ResearchReport {
  const score = sentiment?.overall_score ?? 0;
  const prediction = score > 0.15 ? 'over' : score < -0.15 ? 'under' : 'neutral';
  const confidence = Math.max(0.45, Math.min(0.80, 0.55 + Math.abs(score) * 0.3));
  const now = new Date();
  return {
    playerName,
    propType: propType as ResearchReport['propType'],
    prediction,
    confidence,
    reasoning: `Simulated analysis: sentiment score ${(score * 100).toFixed(0)}% from ${sentiment?.volume ?? 0} mentions.`,
    keyFactors: [
      `Volume: ${sentiment?.volume ?? 0} mentions`,
      `Keywords: ${sentiment?.keywords?.slice(0, 3).join(', ') || 'none'}`,
      `Bullish signals: ${sentiment?.bullish_signals ?? 0} | Bearish: ${sentiment?.bearish_signals ?? 0}`,
    ],
    sentimentWeight: 'Moderate (40%)',
    statWeight: 'Primary (60%)',
    generatedAt: now,
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    simulated: true,
  };
}

export async function generateReport(
  playerName: string,
  propType: string,
  mentions: SocialMention[],
  sentiment: SentimentScore | null,
  playerStats: Record<string, unknown>
): Promise<ResearchReport> {
  // Return cached if still valid
  const key = cacheKey(playerName, propType);
  const cached = reportCache.get(key);
  if (cached && cached.expiresAt > new Date()) return cached;

  const topMentions = mentions.slice(0, 5).map(m => `- ${m.content} (${m.source})`).join('\n');
  const sentimentText = sentiment
    ? `Score: ${(sentiment.overall_score * 100).toFixed(0)}% positive | Volume: ${sentiment.volume} | Keywords: ${sentiment.keywords.join(', ')}`
    : 'No sentiment data';

  const prompt = `You are an expert NBA betting analyst. Analyze this data and predict if the player's prop goes OVER or UNDER.

**Player:** ${playerName}
**Prop:** ${propType}

**Social mentions:**
${topMentions || 'None available'}

**Sentiment:** ${sentimentText}

**Recent stats:**
${JSON.stringify(playerStats, null, 2)}

Respond ONLY with valid JSON (no markdown):
{"prediction":"over"|"under"|"neutral","confidence":0-100,"reasoning":"...","key_factors":["..."],"sentiment_weight":"...","stat_weight":"..."}`;

  const text = await callClaude(prompt);
  if (!text) {
    const report = simulatedReport(playerName, propType, sentiment);
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
      confidence: (json.confidence || 50) / 100,
      reasoning: json.reasoning || 'Analysis unavailable',
      keyFactors: json.key_factors || [],
      sentimentWeight: json.sentiment_weight || 'Moderate',
      statWeight: json.stat_weight || 'Moderate',
      generatedAt: now,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      simulated: false,
    };
    reportCache.set(key, report);
    return report;
  } catch {
    const report = simulatedReport(playerName, propType, sentiment);
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
