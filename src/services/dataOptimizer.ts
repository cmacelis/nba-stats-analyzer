import { Player, PlayerStats, Team } from '../types/nba';
import { cacheService } from './cacheService';

interface NormalizedData<T> {
  byId: { [key: string]: T };
  allIds: string[];
}

export class DataOptimizer {
  private playerCache: NormalizedData<Player> = { byId: {}, allIds: [] };
  private statsCache: NormalizedData<PlayerStats> = { byId: {}, allIds: [] };
  private teamCache: NormalizedData<Team> = { byId: {}, allIds: [] };

  // Normalize data for efficient lookups
  normalizePlayerData(players: Player[]): NormalizedData<Player> {
    const byId: { [key: string]: Player } = {};
    const allIds: string[] = [];

    players.forEach(player => {
      byId[player.id] = player;
      allIds.push(player.id);
    });

    this.playerCache = { byId, allIds };
    return { byId, allIds };
  }

  // Memoized player stats calculation
  calculatePlayerAverages(playerId: string, stats: PlayerStats[]): Promise<PlayerStats> {
    const cacheKey = `player-averages-${playerId}`;
    return cacheService.getOrFetch(cacheKey, async () => {
      const total = stats.reduce((acc, stat) => ({
        points: acc.points + stat.points,
        assists: acc.assists + stat.assists,
        rebounds: acc.rebounds + stat.rebounds,
        steals: acc.steals + stat.steals,
        blocks: acc.blocks + stat.blocks,
        fieldGoalPercentage: acc.fieldGoalPercentage + stat.fieldGoalPercentage,
        threePointPercentage: acc.threePointPercentage + stat.threePointPercentage,
        freeThrowPercentage: acc.freeThrowPercentage + stat.freeThrowPercentage,
        turnovers: acc.turnovers + stat.turnovers,
        minutesPlayed: acc.minutesPlayed + stat.minutesPlayed,
        gamesPlayed: acc.gamesPlayed + 1
      }), {
        points: 0, assists: 0, rebounds: 0, steals: 0, blocks: 0,
        fieldGoalPercentage: 0, threePointPercentage: 0, freeThrowPercentage: 0,
        turnovers: 0, minutesPlayed: 0, gamesPlayed: 0
      });

      return {
        points: total.points / total.gamesPlayed,
        assists: total.assists / total.gamesPlayed,
        rebounds: total.rebounds / total.gamesPlayed,
        steals: total.steals / total.gamesPlayed,
        blocks: total.blocks / total.gamesPlayed,
        fieldGoalPercentage: total.fieldGoalPercentage / total.gamesPlayed,
        threePointPercentage: total.threePointPercentage / total.gamesPlayed,
        freeThrowPercentage: total.freeThrowPercentage / total.gamesPlayed,
        turnovers: total.turnovers / total.gamesPlayed,
        minutesPlayed: total.minutesPlayed / total.gamesPlayed,
        gamesPlayed: total.gamesPlayed
      };
    });
  }

  // Prefetch commonly accessed data
  async prefetchPlayerData(playerIds: string[]): Promise<void> {
    const promises = playerIds.map(id => 
      fetch(`/api/players/${id}`).then(res => res.json())
    );
    
    const players = await Promise.all(promises);
    this.normalizePlayerData(players);
  }

  // Get player by ID with caching
  getPlayer(playerId: string): Player | null {
    return this.playerCache.byId[playerId] || null;
  }

  // Get multiple players efficiently
  getPlayers(playerIds: string[]): Player[] {
    return playerIds
      .map(id => this.getPlayer(id))
      .filter((player): player is Player => player !== null);
  }

  // Clear caches
  clearCaches(): void {
    this.playerCache = { byId: {}, allIds: [] };
    this.statsCache = { byId: {}, allIds: [] };
    this.teamCache = { byId: {}, allIds: [] };
    cacheService.clear();
  }
}

export const dataOptimizer = new DataOptimizer(); 