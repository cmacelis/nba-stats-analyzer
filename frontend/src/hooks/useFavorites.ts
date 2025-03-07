import { useState, useEffect } from 'react';
import { Player } from '../types/player';

interface FavoriteComparison {
  id: string;
  player1: Player;
  player2: Player;
  timestamp: number;
}

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<FavoriteComparison[]>(() => {
    const saved = localStorage.getItem('favoriteComparisons');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('favoriteComparisons', JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = (player1: Player, player2: Player) => {
    const id = `${player1.id}-${player2.id}`;
    if (!favorites.some(fav => fav.id === id)) {
      setFavorites(prev => [...prev, {
        id,
        player1,
        player2,
        timestamp: Date.now()
      }]);
      return true;
    }
    return false;
  };

  const removeFavorite = (id: string) => {
    setFavorites(prev => prev.filter(fav => fav.id !== id));
  };

  return {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite: (id: string) => favorites.some(fav => fav.id === id)
  };
}; 