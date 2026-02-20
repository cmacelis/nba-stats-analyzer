import { Player } from '../types/player';

const FAVORITES_KEY = 'nba_favorite_players';

export async function addFavorite(player: Player): Promise<void> {
  const favorites = getFavoritesFromStorage();
  if (!favorites.find(f => f.id === player.id)) {
    favorites.push(player);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }
}

export async function removeFavorite(playerId: number): Promise<void> {
  const favorites = getFavoritesFromStorage().filter(f => f.id !== playerId);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

export async function getFavorites(): Promise<Player[]> {
  return getFavoritesFromStorage();
}

function getFavoritesFromStorage(): Player[] {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
  } catch {
    return [];
  }
}
