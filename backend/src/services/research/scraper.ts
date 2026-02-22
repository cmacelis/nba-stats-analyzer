/**
 * Research Scraper
 * Fetches NBA player mentions from Reddit and ESPN
 */
import axios from 'axios';

export interface SocialMention {
  content: string;
  source: 'reddit' | 'espn';
  url: string;
  timestamp: Date;
  score?: number;
}

async function fetchRedditMentions(playerName: string): Promise<SocialMention[]> {
  try {
    const q = encodeURIComponent(`${playerName} NBA`);
    const res = await axios.get(
      `https://www.reddit.com/search.json?q=${q}&sort=new&limit=25&t=week`,
      { headers: { 'User-Agent': 'NBA-Research-Bot/1.0' }, timeout: 8000 }
    );
    const posts: any[] = res.data?.data?.children || [];
    return posts
      .filter((p: any) => {
        const sub: string = (p.data?.subreddit || '').toLowerCase();
        return sub.includes('nba') || sub.includes('basketball');
      })
      .map((p: any) => ({
        content: `${p.data.title} ${p.data.selftext || ''}`.slice(0, 300),
        source: 'reddit' as const,
        url: `https://reddit.com${p.data.permalink}`,
        timestamp: new Date(p.data.created_utc * 1000),
        score: p.data.score,
      }));
  } catch (err) {
    console.warn(`[scraper] Reddit failed for "${playerName}":`, (err as Error).message);
    return [];
  }
}

async function fetchEspnMentions(playerName: string): Promise<SocialMention[]> {
  try {
    const base = process.env.ESPN_API_BASE || 'https://site.api.espn.com/apis/site/v2';
    const res = await axios.get(`${base}/sports/basketball/nba/news`, {
      params: { limit: 20 },
      timeout: 8000,
    });
    const articles: any[] = res.data?.articles || [];
    const parts = playerName.toLowerCase().split(' ');
    return articles
      .filter((a: any) => {
        const text = `${a.headline} ${a.description || ''}`.toLowerCase();
        return parts.every((p: string) => text.includes(p));
      })
      .map((a: any) => ({
        content: `${a.headline}: ${a.description || ''}`.slice(0, 300),
        source: 'espn' as const,
        url: a.links?.web?.href || '',
        timestamp: new Date(a.published || Date.now()),
      }));
  } catch (err) {
    console.warn(`[scraper] ESPN failed for "${playerName}":`, (err as Error).message);
    return [];
  }
}

export async function scrapePlayerMentions(playerName: string): Promise<SocialMention[]> {
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
