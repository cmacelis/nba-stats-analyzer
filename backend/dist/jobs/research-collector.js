"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startResearchCollector = startResearchCollector;
exports.stopResearchCollector = stopResearchCollector;
/**
 * Research Collector Job
 * Runs every hour, pre-fetches reports for top NBA players
 */
const scraper_1 = require("../services/research/scraper");
const sentiment_1 = require("../services/research/sentiment");
const synthesizer_1 = require("../services/research/synthesizer");
const TOP_PLAYERS = [
    'LeBron James', 'Stephen Curry', 'Giannis Antetokounmpo',
    'Nikola Jokic', 'Luka Doncic', 'Joel Embiid', 'Kevin Durant',
    'Jayson Tatum', 'Anthony Davis', 'Shai Gilgeous-Alexander',
];
const PROP_TYPES = ['points', 'rebounds', 'assists'];
async function collectForPlayer(playerName) {
    try {
        const mentions = await (0, scraper_1.scrapePlayerMentions)(playerName);
        const sentiment = (0, sentiment_1.analyzeSentiment)(mentions);
        for (const prop of PROP_TYPES) {
            await (0, synthesizer_1.generateReport)(playerName, prop, mentions, sentiment, null);
        }
        console.log(`[collector] Refreshed research for ${playerName}`);
    }
    catch (err) {
        console.error(`[collector] Failed for ${playerName}:`, err.message);
    }
}
async function runCollection() {
    console.log('[collector] Starting hourly research collection...');
    for (const player of TOP_PLAYERS) {
        await collectForPlayer(player);
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    console.log('[collector] Collection complete.');
}
let collectorInterval = null;
function startResearchCollector() {
    if (collectorInterval)
        return;
    runCollection().catch(console.error);
    collectorInterval = setInterval(() => {
        runCollection().catch(console.error);
    }, 60 * 60 * 1000);
    console.log('[collector] Research collector started (interval: 1h)');
}
function stopResearchCollector() {
    if (collectorInterval) {
        clearInterval(collectorInterval);
        collectorInterval = null;
    }
}
