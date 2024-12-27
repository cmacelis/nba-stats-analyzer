import React, { useState, useEffect } from 'react';
import { nbaApi, PlayerStats } from '../../services/nbaApi';
import PlayerSearch from './PlayerSearch';
import { LoadingSpinner } from '../LoadingSpinner';
import './PlayerComparison.css';
import { StatsRadarChart } from './StatsRadarChart';

interface Player {
  id: string;
  fullName: string;
  team: string;
  position: string;
  jersey: string;
  stats?: PlayerStats;
}

const PlayerComparison: React.FC = () => {
  const [player1, setPlayer1] = useState<Player | null>(null);
  const [player2, setPlayer2] = useState<Player | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPlayerStats = async (player: Player, setPlayerFn: (player: Player) => void) => {
    try {
      setLoading(true);
      const stats = await nbaApi.getPlayerStats(player.id);
      setPlayerFn({ ...player, stats });
    } catch (err) {
      setError(`Failed to fetch stats for ${player.fullName}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerSelect = (player: Player, isPlayer1: boolean) => {
    const setPlayerFn = isPlayer1 ? setPlayer1 : setPlayer2;
    setPlayerFn(player);
    fetchPlayerStats(player, setPlayerFn);
  };

  const StatComparison = ({ label, stat1, stat2 }: { label: string; stat1: number; stat2: number }) => {
    const diff = stat1 - stat2;
    const winner = diff > 0 ? 'left' : diff < 0 ? 'right' : '';

    return (
      <div className="stat-row">
        <div className={`stat-value ${winner === 'left' ? 'winner' : ''}`}>{stat1.toFixed(1)}</div>
        <div className="stat-label">{label}</div>
        <div className={`stat-value ${winner === 'right' ? 'winner' : ''}`}>{stat2.toFixed(1)}</div>
      </div>
    );
  };

  return (
    <div className="player-comparison">
      <div className="comparison-header">
        <h2>Player Comparison</h2>
        {error && <div className="comparison-error">{error}</div>}
      </div>

      <div className="comparison-container">
        <div className="player-column">
          <h3>Player 1</h3>
          {!player1 ? (
            <PlayerSearch onPlayerSelect={(p) => handlePlayerSelect(p, true)} />
          ) : (
            <div className="player-info">
              <h4>{player1.fullName}</h4>
              <p>{player1.team} | #{player1.jersey} | {player1.position}</p>
              <button 
                className="change-player-btn"
                onClick={() => setPlayer1(null)}
              >
                Change Player
              </button>
            </div>
          )}
        </div>

        <div className="player-column">
          <h3>Player 2</h3>
          {!player2 ? (
            <PlayerSearch onPlayerSelect={(p) => handlePlayerSelect(p, false)} />
          ) : (
            <div className="player-info">
              <h4>{player2.fullName}</h4>
              <p>{player2.team} | #{player2.jersey} | {player2.position}</p>
              <button 
                className="change-player-btn"
                onClick={() => setPlayer2(null)}
              >
                Change Player
              </button>
            </div>
          )}
        </div>
      </div>

      {loading && <LoadingSpinner />}

      {player1?.stats && player2?.stats && (
        <>
          <div className="stats-comparison">
            <div className="stats-section">
              <h3>Basic Stats</h3>
              <StatComparison label="Points" stat1={player1.stats.points} stat2={player2.stats.points} />
              <StatComparison label="Assists" stat1={player1.stats.assists} stat2={player2.stats.assists} />
              <StatComparison label="Rebounds" stat1={player1.stats.rebounds} stat2={player2.stats.rebounds} />
              <StatComparison label="Steals" stat1={player1.stats.steals} stat2={player2.stats.steals} />
              <StatComparison label="Blocks" stat1={player1.stats.blocks} stat2={player2.stats.blocks} />
            </div>

            <div className="stats-section">
              <h3>Shooting</h3>
              <StatComparison label="FG%" stat1={player1.stats.fieldGoalPercentage} stat2={player2.stats.fieldGoalPercentage} />
              <StatComparison label="3P%" stat1={player1.stats.threePointPercentage} stat2={player2.stats.threePointPercentage} />
              <StatComparison label="FT%" stat1={player1.stats.freeThrowPercentage} stat2={player2.stats.freeThrowPercentage} />
              <StatComparison label="TS%" stat1={player1.stats.trueShootingPercentage} stat2={player2.stats.trueShootingPercentage} />
              <StatComparison label="eFG%" stat1={player1.stats.effectiveFieldGoalPercentage} stat2={player2.stats.effectiveFieldGoalPercentage} />
            </div>

            <div className="stats-section">
              <h3>Advanced</h3>
              <StatComparison label="Usage%" stat1={player1.stats.usagePercentage} stat2={player2.stats.usagePercentage} />
              <StatComparison label="+/-" stat1={player1.stats.plusMinus} stat2={player2.stats.plusMinus} />
              <StatComparison label="Games" stat1={player1.stats.gamesPlayed} stat2={player2.stats.gamesPlayed} />
              <StatComparison label="Minutes" stat1={player1.stats.minutesPerGame} stat2={player2.stats.minutesPerGame} />
            </div>

            <div className="visualization-section">
              <h3>Visual Comparison</h3>
              <StatsRadarChart 
                player1={{ fullName: player1.fullName, stats: player1.stats }}
                player2={{ fullName: player2.fullName, stats: player2.stats }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PlayerComparison; 