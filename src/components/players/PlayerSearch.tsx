import React, { useState, useEffect } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { nbaApi } from '../../services/nbaApi';
import { LoadingSpinner } from '../LoadingSpinner';
import './PlayerSearch.css';

interface Player {
  id: string;
  fullName: string;
  team: string;
  position: string;
  jersey: string;
}

interface PlayerSearchProps {
  onPlayerSelect?: (player: Player) => void;
}

const PlayerSearch: React.FC<PlayerSearchProps> = ({ onPlayerSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    const searchPlayers = async () => {
      if (!debouncedSearch) {
        setPlayers([]);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const results = await nbaApi.searchPlayers(debouncedSearch);
        setPlayers(results);
      } catch (err) {
        setError('Failed to fetch players');
        console.error('Error fetching players:', err);
      } finally {
        setLoading(false);
      }
    };

    searchPlayers();
  }, [debouncedSearch]);

  const handlePlayerClick = (player: Player) => {
    if (onPlayerSelect) {
      onPlayerSelect(player);
    }
  };

  return (
    <div className="player-search">
      <div className="search-container">
        <input
          type="text"
          placeholder="Search for a player..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        {loading && <div className="search-loading"><LoadingSpinner /></div>}
      </div>

      {error && <div className="search-error">{error}</div>}

      <div className="search-results">
        {players.map(player => (
          <div 
            key={player.id} 
            className="player-card"
            onClick={() => handlePlayerClick(player)}
          >
            <h3>{player.fullName}</h3>
            <p>
              {player.team} | #{player.jersey} | {player.position}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerSearch; 