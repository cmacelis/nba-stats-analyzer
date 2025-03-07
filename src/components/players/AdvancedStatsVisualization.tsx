import * as React from 'react';
import { Radar, Bar } from 'react-chartjs-2';
import { Player } from '../../types/nba';

interface AdvancedStatsProps {
  player: Player;
}

const AdvancedStatsVisualization: React.FC<AdvancedStatsProps> = ({ player }) => {
  return (
    <div className="advanced-stats">
      <div className="radar-chart">
        {/* Add radar chart for player stats */}
      </div>
      <div className="bar-chart">
        {/* Add bar chart for comparisons */}
      </div>
    </div>
  );
};

export default AdvancedStatsVisualization; 