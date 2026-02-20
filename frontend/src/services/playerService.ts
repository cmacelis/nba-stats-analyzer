import { Player } from '../types/player';
import { searchPlayers as nbaSearchPlayers, BallDontLiePlayer } from './nbaApiService';
import { mapApiPlayerToPlayer } from '../utils/dataMappers';

export const searchPlayers = async (query: string): Promise<Player[]> => {
  if (query.length < 2) return [];
  const result = await nbaSearchPlayers(query);
  return (result.data || []).map((p: BallDontLiePlayer) => mapApiPlayerToPlayer(p));
};
