import axios from 'axios';
import { Player, PlayerStats, Matchup } from '../types/nba';
import { cacheService } from './cacheService';
import { withRetry } from '../utils/apiRetry';

class NBAApi {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_PROXY;
  }

  async getPlayer(playerId: string): Promise<Player> {
    const cacheKey = `player-${playerId}`;
    const cached = cacheService.get<Player>(cacheKey);
    if (cached) return cached;

    const response = await withRetry(() => 
      axios.get(`${this.baseUrl}/players/${playerId}`)
    );
    
    const player = response.data;
    cacheService.set(cacheKey, player, 60 * 60); // Cache for 1 hour
    return player;
  }

  async getPlayerStats(playerId: string, season: string): Promise<PlayerStats[]> {
    const cacheKey = `stats-${playerId}-${season}`;
    const cached = cacheService.get<PlayerStats[]>(cacheKey);
    if (cached) return cached;

    const response = await withRetry(() => 
      axios.get(`${this.baseUrl}/players/${playerId}/stats`, {
        params: { season }
      })
    );
    
    const stats = response.data;
    cacheService.set(cacheKey, stats, 5 * 60); // Cache for 5 minutes
    return stats;
  }

  async searchPlayers(query: string): Promise<Player[]> {
    const response = await withRetry(() => 
      axios.get(`${this.baseUrl}/players/search`, {
        params: { q: query }
      })
    );
    
    return response.data;
  }

  async getHeadToHead(player1Id: string, player2Id: string): Promise<Matchup[]> {
    const cacheKey = `h2h-${player1Id}-${player2Id}`;
    const cached = cacheService.get<Matchup[]>(cacheKey);
    if (cached) return cached;

    const response = await withRetry(() => 
      axios.get(`${this.baseUrl}/players/head-to-head`, {
        params: { player1Id, player2Id }
      })
    );
    
    const matchups = response.data;
    cacheService.set(cacheKey, matchups, 5 * 60); // Cache for 5 minutes
    return matchups;
  }
}

export const nbaApi = new NBAApi(); 