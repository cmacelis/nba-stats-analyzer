/**
 * Research Collector Job
 * Runs every hour, pre-fetches reports for top NBA players
 */
import { scrapePlayerMentions } from '../services/research/scraper';
import { analyzeSentiment } from '../services/research/sentiment';
import { generateReport } from '../services/research/synthesizer';

const TOP_PLAYERS = [
  'LeBron James', 'Stephen Curry', 'Giannis Antetokounmpo',
  'Nikola Jokic', 'Luka Doncic', 'Joel Embiid', 'Kevin Durant',
  'Jayson Tatum', 'Anthony Davis', 'Shai Gilgeous-Alexander',
];

const PROP_TYPES = ['points', 'rebounds', 'assists'] as const;

async function collectForPlayer(playerName: string): Promise<void> {
  try {
    const mentions = await scrapePlayerMentions(playerName);
    const sentiment = analyzeSentiment(mentions);
    for (const prop of PROP_TYPES) {
      await generateReport(playerName, prop, mentions, sentiment, null);
    }
    console.log(`[collector] Refreshed research for ${playerName}`);
  } catch (err) {
    console.error(`[collector] Failed for ${playerName}:`, (err as Error).message);
  }
}

async function runCollection(): Promise<void> {
  console.log('[collector] Starting hourly research collection...');
  for (const player of TOP_PLAYERS) {
    await collectForPlayer(player);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  console.log('[collector] Collection complete.');
}

let collectorInterval: NodeJS.Timeout | null = null;

export function startResearchCollector(): void {
  if (collectorInterval) return;
  runCollection().catch(console.error);
  collectorInterval = setInterval(() => {
    runCollection().catch(console.error);
  }, 60 * 60 * 1000);
  console.log('[collector] Research collector started (interval: 1h)');
}

export function stopResearchCollector(): void {
  if (collectorInterval) {
    clearInterval(collectorInterval);
    collectorInterval = null;
  }
}
