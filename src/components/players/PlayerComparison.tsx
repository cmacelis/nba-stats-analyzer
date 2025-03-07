import * as React from 'react';
import { Player, PlayerStats } from '../../types/nba';
import { useComparisonData } from '../../hooks/useComparisonData';
import PlayerSelector from './PlayerSelector';
import SeasonSelector from './SeasonSelector';
import StatsTable from './StatsTable';
import SeasonalComparison from './SeasonalComparison';
import AdvancedMetrics from './AdvancedMetrics';
import HeadToHeadComparison from './HeadToHeadComparison';
import { LoadingSpinner } from '../LoadingSpinner';
import ErrorMessage from '../shared/ErrorMessage';
import './PlayerComparison.css';

interface PlayerComparisonProps {
  player1: Player;
  player2: Player;
  seasonStats1: PlayerStats[];
  seasonStats2: PlayerStats[];
}

const PlayerComparison: React.FC<PlayerComparisonProps> = ({
  player1,
  player2,
  seasonStats1,
  seasonStats2
}) => {
  const [season, setSeason] = React.useState(getCurrentSeason());
  const { data, loading, error, fetchPlayerData } = useComparisonData();

  React.useEffect(() => {
    if (player1 && player2) {
      fetchPlayerData(player1.id, player2.id, season);
    }
  }, [player1, player2, season]);

  if (error) {
    return <ErrorMessage message={error.message} />;
  }

  return (
    <div className="player-comparison">
      <div className="comparison-header">
        <h2>Player Comparison</h2>
        <SeasonSelector 
          selectedSeason={season}
          onSeasonChange={setSeason}
        />
      </div>

      <div className="player-selectors">
        <PlayerSelector
          label="Player 1"
          onPlayerSelect={setPlayer1}
          selected={player1}
        />
        <PlayerSelector
          label="Player 2"
          onPlayerSelect={setPlayer2}
          selected={player2}
        />
      </div>

      {loading ? (
        <LoadingSpinner text="Loading comparison data..." />
      ) : data && player1 && player2 ? (
        <>
          <StatsTable
            player1={player1}
            player2={player2}
            stats1={data.stats1}
            stats2={data.stats2}
          />
          
          <AdvancedMetrics
            player1={player1}
            player2={player2}
            stats1={data.stats1}
            stats2={data.stats2}
          />

          <SeasonalComparison
            player1={player1}
            player2={player2}
            seasonStats1={data.seasonStats1}
            seasonStats2={data.seasonStats2}
          />

          <HeadToHeadComparison
            player1={player1}
            player2={player2}
            matchups={data.matchups}
          />
        </>
      ) : null}
    </div>
  );
};

export default PlayerComparison; 