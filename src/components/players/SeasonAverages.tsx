import * as React from 'react';
import { PlayerStats } from '../../types/nba';
import './SeasonAverages.css';

interface SeasonAveragesProps {
  stats: PlayerStats;
  comparison?: PlayerStats;
}

interface StatDisplay {
  key: keyof PlayerStats;
  label: string;
  format?: (value: number) => string;
}

const DISPLAY_STATS: StatDisplay[] = [
  { key: 'points', label: 'Points' },
  { key: 'assists', label: 'Assists' },
  { key: 'rebounds', label: 'Rebounds' },
  { key: 'steals', label: 'Steals' },
  { key: 'blocks', label: 'Blocks' },
  { 
    key: 'fieldGoalPercentage', 
    label: 'FG%',
    format: (value) => `${(value * 100).toFixed(1)}%`
  }
];

const SeasonAverages: React.FC<SeasonAveragesProps> = ({ stats, comparison }) => {
  const formatValue = (stat: StatDisplay, value: number): string => {
    if (stat.format) {
      return stat.format(value);
    }
    return value.toFixed(1);
  };

  const getComparisonClass = (current: number, compared?: number): string => {
    if (!compared) return '';
    return current > compared ? 'better' : current < compared ? 'worse' : '';
  };

  return (
    <div className="season-averages">
      <div className="stats-grid">
        {DISPLAY_STATS.map(stat => (
          <div key={stat.key} className="stat-item">
            <span className="stat-label">{stat.label}</span>
            <span className={`stat-value ${getComparisonClass(
              stats[stat.key] as number,
              comparison?.[stat.key] as number
            )}`}>
              {formatValue(stat, stats[stat.key] as number)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SeasonAverages; 