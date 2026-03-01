"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapePlayerMentions = scrapePlayerMentions;
/**
 * Research Scraper
 * Fetches NBA player mentions from Reddit, ESPN, and Twitter
 */
const axios_1 = __importDefault(require("axios"));
async function fetchRedditMentions(playerName) {
    try {
        const q = encodeURIComponent(`${playerName} NBA`);
        const res = await axios_1.default.get(`https://www.reddit.com/search.json?q=${q}&sort=new&limit=25&t=week`, { headers: { 'User-Agent': 'NBA-Research-Bot/1.0' }, timeout: 8000 });
        const posts = res.data?.data?.children || [];
        return posts
            .filter((p) => {
            const sub = (p.data?.subreddit || '').toLowerCase();
            return sub.includes('nba') || sub.includes('basketball');
        })
            .map((p) => ({
            content: `${p.data.title} ${p.data.selftext || ''}`.slice(0, 300),
            source: 'reddit',
            url: `https://reddit.com${p.data.permalink}`,
            timestamp: new Date(p.data.created_utc * 1000),
            score: p.data.score,
        }));
    }
    catch (err) {
        console.warn(`[scraper] Reddit failed for "${playerName}":`, err.message);
        return [];
    }
}
async function fetchEspnMentions(playerName) {
    try {
        const base = process.env.ESPN_API_BASE || 'https://site.api.espn.com/apis/site/v2';
        const res = await axios_1.default.get(`${base}/sports/basketball/nba/news`, {
            params: { limit: 20 },
            timeout: 8000,
        });
        const articles = res.data?.articles || [];
        const parts = playerName.toLowerCase().split(' ');
        return articles
            .filter((a) => {
            const text = `${a.headline} ${a.description || ''}`.toLowerCase();
            return parts.every((p) => text.includes(p));
        })
            .map((a) => ({
            content: `${a.headline}: ${a.description || ''}`.slice(0, 300),
            source: 'espn',
            url: a.links?.web?.href || '',
            timestamp: new Date(a.published || Date.now()),
        }));
    }
    catch (err) {
        console.warn(`[scraper] ESPN failed for "${playerName}":`, err.message);
        return [];
    }
}
async function scrapePlayerMentions(playerName) {
    const [reddit, espn] = await Promise.allSettled([
        fetchRedditMentions(playerName),
        fetchEspnMentions(playerName),
    ]);
    const all = [
        ...(reddit.status === 'fulfilled' ? reddit.value : []),
        ...(espn.status === 'fulfilled' ? espn.value : []),
    ];
    return all
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 30);
}
