import * as React from 'react';
import './VisualizationControls.css';

interface VisualizationControlsProps {
  onChartTypeChange: (type: string) => void;
  onMetricChange: (metric: string) => void;
  onTimeRangeChange: (range: string) => void;
}

const VisualizationControls: React.FC<VisualizationControlsProps> = ({
  onChartTypeChange,
  onMetricChange,
  onTimeRangeChange
}) => {
  return (
    <div className="visualization-controls">
      <div className="control-group">
        <label>Chart Type</label>
        <select onChange={(e) => onChartTypeChange(e.target.value)}>
          <option value="line">Line Chart</option>
          <option value="bar">Bar Chart</option>
          <option value="radar">Radar Chart</option>
          <option value="scatter">Scatter Plot</option>
        </select>
      </div>

      <div className="control-group">
        <label>Metric</label>
        <select onChange={(e) => onMetricChange(e.target.value)}>
          <option value="basic">Basic Stats</option>
          <option value="advanced">Advanced Stats</option>
          <option value="shooting">Shooting Stats</option>
          <option value="impact">Impact Metrics</option>
        </select>
      </div>

      <div className="control-group">
        <label>Time Range</label>
        <select onChange={(e) => onTimeRangeChange(e.target.value)}>
          <option value="game">Per Game</option>
          <option value="month">Per Month</option>
          <option value="season">Per Season</option>
          <option value="career">Career</option>
        </select>
      </div>
    </div>
  );
};

export default VisualizationControls; 