import * as React from 'react';
import './NewsFilter.css';

interface NewsFilterProps {
  onFilterChange: (filters: {
    categories: string[];
    teams: string[];
    players: string[];
  }) => void;
}

const NewsFilter: React.FC<NewsFilterProps> = ({ onFilterChange }) => {
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = React.useState<string[]>([]);
  const [selectedPlayers, setSelectedPlayers] = React.useState<string[]>([]);

  const categories = [
    'Game Recaps',
    'Trades',
    'Injuries',
    'Stats Analysis',
    'Team News'
  ];

  const popularTeams = [
    'Lakers',
    'Celtics',
    'Warriors',
    'Bulls',
    'Heat'
  ];

  const topPlayers = [
    'LeBron James',
    'Stephen Curry',
    'Kevin Durant',
    'Giannis Antetokounmpo',
    'Nikola Jokic'
  ];

  const handleCategoryChange = (category: string) => {
    setSelectedCategories(prev => {
      const updated = prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category];
      
      onFilterChange({
        categories: updated,
        teams: selectedTeams,
        players: selectedPlayers
      });
      
      return updated;
    });
  };

  const handleTeamChange = (team: string) => {
    setSelectedTeams(prev => {
      const updated = prev.includes(team)
        ? prev.filter(t => t !== team)
        : [...prev, team];
      
      onFilterChange({
        categories: selectedCategories,
        teams: updated,
        players: selectedPlayers
      });
      
      return updated;
    });
  };

  const handlePlayerChange = (player: string) => {
    setSelectedPlayers(prev => {
      const updated = prev.includes(player)
        ? prev.filter(p => p !== player)
        : [...prev, player];
      
      onFilterChange({
        categories: selectedCategories,
        teams: selectedTeams,
        players: updated
      });
      
      return updated;
    });
  };

  return (
    <div className="news-filter">
      <div className="filter-section">
        <h3>Categories</h3>
        <div className="filter-options">
          {categories.map(category => (
            <label key={category} className="filter-option">
              <input
                type="checkbox"
                checked={selectedCategories.includes(category)}
                onChange={() => handleCategoryChange(category)}
              />
              <span>{category}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <h3>Teams</h3>
        <div className="filter-options">
          {popularTeams.map(team => (
            <label key={team} className="filter-option">
              <input
                type="checkbox"
                checked={selectedTeams.includes(team)}
                onChange={() => handleTeamChange(team)}
              />
              <span>{team}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <h3>Players</h3>
        <div className="filter-options">
          {topPlayers.map(player => (
            <label key={player} className="filter-option">
              <input
                type="checkbox"
                checked={selectedPlayers.includes(player)}
                onChange={() => handlePlayerChange(player)}
              />
              <span>{player}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewsFilter; 