import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Player } from '../../types/nba';
import { nbaApi } from '../../services/nbaApi';
import { useDebounce } from '../../hooks/useDebounce';
import './PlayerSelector.css';

interface PlayerSelectorProps {
  onPlayerSelect: (player: Player) => void;
  selectedPlayer: Player | null;
}

const PlayerSelector: React.FC<PlayerSelectorProps> = ({ onPlayerSelect, selectedPlayer }) => {
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data: players, isLoading } = useQuery(
    ['players', debouncedSearch],
    () => nbaApi.searchPlayers(debouncedSearch),
    {
      enabled: debouncedSearch.length >= 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  return (
    <div className="player-selector">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search for a player..."
        className="player-search"
      />
      
      {isLoading && <div className="loading">Searching...</div>}
      
      {players && players.length > 0 && (
        <ul className="player-list">
          {players.map(player => (
            <li 
              key={player.id}
              onClick={() => {
                onPlayerSelect(player);
                setSearch('');
              }}
              className={selectedPlayer?.id === player.id ? 'selected' : ''}
            >
              <span className="player-name">{player.fullName}</span>
              <span className="player-team">{player.teamId}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PlayerSelector; 