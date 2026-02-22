/**
 * Sentiment Analysis — keyword-based scoring of NBA player mentions
 */
import { SocialMention } from './scraper';

export interface SentimentScore {
  overall_score: number;    // -1 to +1
  volume: number;
  keywords: string[];
  bullish_signals: number;
  bearish_signals: number;
}

const BULLISH = [
  'hot', 'fire', 'beast', 'dominant', 'mvp', 'unstoppable', 'lock',
  'elite', 'bucket', 'clutch', 'healthy', 'motivated', 'rolling', 'streak',
  'strong', 'consistent', 'efficient', 'explosion', 'dropped', 'killing',
];

const BEARISH = [
  'injury', 'injured', 'hurt', 'questionable', 'doubtful', 'out', 'miss',
  'slumping', 'cold', 'struggling', 'bench', 'rest', 'limited', 'suspension',
  'inconsistent', 'slow', 'tired', 'dnp', 'trade', 'frustration',
];

function extractKeywords(texts: string[]): string[] {
  const allWords = texts.join(' ').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/);
  const freq = new Map<string, number>();
  for (const w of allWords) {
    if ([...BULLISH, ...BEARISH].includes(w)) {
      freq.set(w, (freq.get(w) || 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w);
}

export function analyzeSentiment(mentions: SocialMention[]): SentimentScore {
  if (mentions.length === 0) {
    return { overall_score: 0, volume: 0, keywords: [], bullish_signals: 0, bearish_signals: 0 };
  }

  let bullish = 0;
  let bearish = 0;

  for (const m of mentions) {
    const text = m.content.toLowerCase();
    const weight = m.score ? Math.min(1 + Math.log10(m.score + 1) * 0.3, 2) : 1;
    for (const kw of BULLISH) { if (text.includes(kw)) bullish += weight; }
    for (const kw of BEARISH) { if (text.includes(kw)) bearish += weight; }
  }

  const total = bullish + bearish;
  return {
    overall_score: total > 0 ? Math.max(-1, Math.min(1, (bullish - bearish) / total)) : 0,
    volume: mentions.length,
    keywords: extractKeywords(mentions.map(m => m.content)),
    bullish_signals: Math.round(bullish),
    bearish_signals: Math.round(bearish),
  };
}
