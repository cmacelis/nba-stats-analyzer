import React, { useState } from 'react';
import './PlayerComparison.css';

interface Player {
  id: string;
  fullName: string;
  team: string;
  position: string;
}

const PlayerComparison: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [player1, setPlayer1] = useState<Player | null>(null);
  const [player2, setPlayer2] = useState<Player | null>(null);

  return (
    <div className="player-comparison">
      <div className="search-container">
        <div className="player-search">
          <input
            type="text"
            placeholder="Search for a player"
            onChange={(e) => console.log('Search 1:', e.target.value)}
          />
          {isLoading && <div data-testid="loading-spinner">Loading...</div>}
        </div>

        <div className="player-search">
          <input
            type="text"
            placeholder="Search for a player"
            onChange={(e) => console.log('Search 2:', e.target.value)}
          />
          {isLoading && <div data-testid="loading-spinner">Loading...</div>}
        </div>
      </div>
    </div>
  );
};

export default PlayerComparison; 