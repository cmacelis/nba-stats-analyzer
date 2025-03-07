import * as React from 'react';
import { Player, PlayerStats } from '../../types/nba';
import './StatsTable.css';

interface StatsTableProps {
  player1: Player;
  player2: Player;
  stats1: PlayerStats;
  stats2: PlayerStats;
}

const StatsTable: React.FC<StatsTableProps> = ({ player1, player2, stats1, stats2 }) => {
  const statCategories = [
    { key: 'points', label: 'Points' },
    { key: 'assists', label: 'Assists' },
    { key: 'rebounds', label: 'Rebounds' },
    { key: 'steals', label: 'Steals' },
    { key: 'blocks', label: 'Blocks' },
    { key: 'fieldGoalPercentage', label: 'FG%' },
    { key: 'threePointPercentage', label: '3P%' },
    { key: 'freeThrowPercentage', label: 'FT%' },
    { key: 'minutesPerGame', label: 'MPG' },
  ] as const;

  const getComparisonClass = (stat: keyof PlayerStats, value1: number, value2: number) => {
    if (stat.includes('Percentage') || stat === 'minutesPerGame') return '';
    return value1 > value2 ? 'better' : value1 < value2 ? 'worse' : '';
  };

  return (
    <div className="stats-table">
      <table>
        <thead>
          <tr>
            <th>Statistic</th>
            <th>{player1.fullName}</th>
            <th>{player2.fullName}</th>
          </tr>
        </thead>
        <tbody>
          {statCategories.map(({ key, label }) => (
            <tr key={key}>
              <td>{label}</td>
              <td className={getComparisonClass(key, stats1[key], stats2[key])}>
                {stats1[key].toFixed(1)}
              </td>
              <td className={getComparisonClass(key, stats2[key], stats1[key])}>
                {stats2[key].toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StatsTable; 