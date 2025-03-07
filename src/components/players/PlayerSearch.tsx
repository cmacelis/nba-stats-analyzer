import * as React from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { nbaApi } from '../../services/nbaApi';
import { Player } from '../../types/nba';
import { LoadingSpinner } from '../LoadingSpinner';
import './PlayerSearch.css';

interface PlayerSearchProps {
  onPlayerSelect: (player: Player) => void;
  selectedSeason: string;
}

const PlayerSearch: React.FC<PlayerSearchProps> = ({ onPlayerSelect, selectedSeason }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [players, setPlayers] = React.useState<Player[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  const debouncedSearch = useDebounce(searchTerm, 300);

  React.useEffect(() => {
    const searchPlayers = async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) {
        setPlayers([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const results = await nbaApi.searchPlayers(debouncedSearch, { season: selectedSeason });
        setPlayers(results);
      } catch (err) {
        setError('Failed to search players');
        console.error('Error searching players:', err);
      } finally {
        setLoading(false);
      }
    };

    searchPlayers();
  }, [debouncedSearch, selectedSeason]);

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
            onClick={() => onPlayerSelect(player)}
          >
            <h3>{player.fullName}</h3>
            <p>{player.team} | {player.position}</p>
          </div>
        ))}
        {!loading && players.length === 0 && searchTerm.length >= 2 && (
          <div className="no-results">
            No players found. Try different search terms.
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerSearch; 