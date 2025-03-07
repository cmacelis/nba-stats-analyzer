import * as React from 'react';
import { Player } from '../../types/nba';
import PlayerSearch from '../players/PlayerSearch';
import { LoadingSpinner } from '../LoadingSpinner';
import './FavoritePlayers.css';

const FavoritePlayers: React.FC = () => {
  const [favorites, setFavorites] = React.useState<Player[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadFavorites = async () => {
      try {
        // TODO: Load favorites from backend
        setFavorites([]);
        setLoading(false);
      } catch (error) {
        console.error('Error loading favorites:', error);
        setLoading(false);
      }
    };

    loadFavorites();
  }, []);

  const handleAddFavorite = async (player: Player) => {
    try {
      // TODO: Add to backend
      setFavorites(prev => [...prev, player]);
    } catch (error) {
      console.error('Error adding favorite:', error);
    }
  };

  const handleRemoveFavorite = async (playerId: string) => {
    try {
      // TODO: Remove from backend
      setFavorites(prev => prev.filter(p => p.id !== playerId));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="favorite-players">
      <div className="add-favorite">
        <h3>Add Favorite Player</h3>
        <PlayerSearch 
          onPlayerSelect={handleAddFavorite}
          selectedSeason="2023-24"
        />
      </div>

      <div className="favorites-list">
        <h3>Your Favorite Players</h3>
        {favorites.length === 0 ? (
          <p className="no-favorites">No favorite players added yet</p>
        ) : (
          <div className="favorites-grid">
            {favorites.map(player => (
              <div key={player.id} className="favorite-card">
                <div className="player-info">
                  <h4>{player.fullName}</h4>
                  <p>{player.team} | {player.position}</p>
                </div>
                <button
                  className="remove-button"
                  onClick={() => handleRemoveFavorite(player.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritePlayers; 