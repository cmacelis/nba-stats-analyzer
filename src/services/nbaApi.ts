import axios from 'axios';

const NBA_API_BASE_URL = 'https://stats.nba.com/stats';
const PROXY_URL = process.env.REACT_APP_API_PROXY || '/api';

// Custom headers required for NBA Stats API
const headers = {
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Host': 'stats.nba.com',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Referer': 'https://www.nba.com/',
  'x-nba-stats-origin': 'stats',
  'x-nba-stats-token': 'true'
};

interface PlayerSearchResponse {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  teamId: number;
  team: string;
  position: string;
  jersey: string;
}

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

export interface PlayerStats {
  // Basic stats
  points: number;
  assists: number;
  rebounds: number;
  steals: number;
  blocks: number;
  turnovers: number;
  
  // Shooting percentages
  fieldGoalPercentage: number;
  threePointPercentage: number;
  freeThrowPercentage: number;
  
  // Advanced stats
  gamesPlayed: number;
  minutesPerGame: number;
  plusMinus: number;
  trueShootingPercentage: number;
  effectiveFieldGoalPercentage: number;
  usagePercentage: number;
  
  // Per game breakdowns
  offensiveRebounds: number;
  defensiveRebounds: number;
  personalFouls: number;
}

class NBAApi {
  private cache: Map<string, CacheItem<any>> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private getCacheKey(endpoint: string, params: Record<string, string>): string {
    return `${endpoint}?${new URLSearchParams(params).toString()}`;
  }

  private isValidCache<T>(cacheItem: CacheItem<T>): boolean {
    return Date.now() - cacheItem.timestamp < this.CACHE_DURATION;
  }

  private async fetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const cacheKey = this.getCacheKey(endpoint, params);
    const cachedItem = this.cache.get(cacheKey);

    if (cachedItem && this.isValidCache(cachedItem)) {
      return cachedItem.data;
    }

    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `${PROXY_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;
      
      const response = await axios.get(url, { headers });
      
      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });

      return response.data;
    } catch (error) {
      console.error('NBA API Error:', error);
      throw new Error('Failed to fetch data from NBA API');
    }
  }

  async searchPlayers(searchTerm: string): Promise<PlayerSearchResponse[]> {
    const endpoint = '/playerindex.json';
    const params = {
      Historical: '0',
      LeagueID: '00',
      Season: '2023-24',
      ActiveFlag: 'Y',
      PlayerName: searchTerm
    };

    const response = await this.fetch<any>(endpoint, params);
    
    // Transform the response to match our interface
    return response.resultSets[0].rowSet.map((player: any[]) => ({
      id: player[0],
      fullName: `${player[2]} ${player[1]}`,
      firstName: player[2],
      lastName: player[1],
      teamId: player[7],
      team: player[8],
      position: player[11],
      jersey: player[10]
    }));
  }

  async getPlayerStats(playerId: string): Promise<PlayerStats> {
    const endpoint = '/playerdashboardbyyearoveryear';
    const params = {
      PlayerID: playerId,
      PerMode: 'PerGame',
      LeagueID: '00',
      Season: '2023-24'
    };

    const response = await this.fetch<any>(endpoint, params);
    return this.transformPlayerStats(response);
  }

  private transformPlayerStats(response: any): PlayerStats {
    const currentSeason = response.resultSets[0].rowSet[0];
    const advancedStats = response.resultSets[1].rowSet[0];
    
    return {
      points: currentSeason[26],
      assists: currentSeason[21],
      rebounds: currentSeason[20],
      steals: currentSeason[22],
      blocks: currentSeason[23],
      turnovers: currentSeason[24],
      
      fieldGoalPercentage: currentSeason[11],
      threePointPercentage: currentSeason[14],
      freeThrowPercentage: currentSeason[17],
      
      gamesPlayed: currentSeason[6],
      minutesPerGame: currentSeason[8],
      plusMinus: advancedStats[38],
      trueShootingPercentage: advancedStats[11],
      effectiveFieldGoalPercentage: advancedStats[9],
      usagePercentage: advancedStats[22],
      
      offensiveRebounds: currentSeason[18],
      defensiveRebounds: currentSeason[19],
      personalFouls: currentSeason[25]
    };
  }
}

export const nbaApi = new NBAApi(); 