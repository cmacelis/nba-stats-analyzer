import * as React from 'react';
import './SeasonSelector.css';

interface SeasonSelectorProps {
  selectedSeason: string;
  onSeasonChange: (season: string) => void;
}

const SeasonSelector: React.FC<SeasonSelectorProps> = ({ selectedSeason, onSeasonChange }) => {
  const currentYear = new Date().getFullYear();
  const seasons = Array.from({ length: 10 }, (_, i) => {
    const year = currentYear - i;
    return `${year}-${(year + 1).toString().slice(2)}`;
  });

  return (
    <div className="season-selector">
      <label htmlFor="season-select">Season:</label>
      <select
        id="season-select"
        value={selectedSeason}
        onChange={(e) => onSeasonChange(e.target.value)}
        className="season-select"
      >
        {seasons.map(season => (
          <option key={season} value={season}>
            {season}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SeasonSelector; 