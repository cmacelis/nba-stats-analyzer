import * as React from 'react';
import { Player, PlayerStats } from '../../types/nba';
import { AdvancedStatsCalculator } from '../../utils/AdvancedStatsCalculator';
import './PrintableReport.css';

interface PrintableReportProps {
  player1: Player;
  player2: Player;
  seasonStats1: PlayerStats[];
  seasonStats2: PlayerStats[];
}

const PrintableReport: React.FC<PrintableReportProps> = ({
  player1,
  player2,
  seasonStats1,
  seasonStats2
}) => {
  const advanced1 = AdvancedStatsCalculator.getAdvancedStats(seasonStats1[0]);
  const advanced2 = AdvancedStatsCalculator.getAdvancedStats(seasonStats2[0]);

  return (
    <div className="printable-report">
      <div className="report-header">
        <h2>Player Comparison Report</h2>
        <p className="date">Generated on {new Date().toLocaleDateString()}</p>
      </div>

      <div className="players-comparison">
        <div className="player-column">
          <h3>{player1.fullName}</h3>
          <p className="team">{player1.team}</p>
        </div>
        <div className="vs">VS</div>
        <div className="player-column">
          <h3>{player2.fullName}</h3>
          <p className="team">{player2.team}</p>
        </div>
      </div>

      <div className="stats-comparison">
        {/* Add detailed stats comparison */}
      </div>

      <div className="report-footer">
        <p>CourtVision Analytics</p>
        <p className="disclaimer">For analytical purposes only</p>
      </div>
    </div>
  );
};

export default PrintableReport; 