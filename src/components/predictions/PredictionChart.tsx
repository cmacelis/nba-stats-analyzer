import React from 'react';
import { Line } from 'react-chartjs-2';
import { PlayerStats } from '../../types/nba';
import './PredictionChart.css';

interface PredictionChartProps {
  historicalData: PlayerStats[];
  predictedData: PlayerStats;
}

const PredictionChart: React.FC<PredictionChartProps> = ({ historicalData, predictedData }) => {
  const labels = historicalData.map((_, index) => `Game ${index + 1}`);
  const data = {
    labels,
    datasets: [
      {
        label: 'Historical Performance',
        data: historicalData.map(stats => stats.points),
        borderColor: 'rgba(30, 60, 114, 1)',
        backgroundColor: 'rgba(30, 60, 114, 0.2)',
        fill: true,
      },
      {
        label: 'Predicted Performance',
        data: Array(historicalData.length).fill(predictedData.points),
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        fill: true,
      },
    ],
  };

  const options = {
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="prediction-chart">
      <Line data={data} options={options} />
    </div>
  );
};

export default PredictionChart; 