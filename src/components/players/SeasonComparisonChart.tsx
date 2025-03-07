import * as React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { nbaApi } from '../../services/nbaApi';
import './SeasonComparisonChart.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface SeasonComparisonChartProps {
  player1: Player;
  player2: Player;
  statKey: keyof PlayerStats;
  title: string;
}

const SeasonComparisonChart: React.FC<SeasonComparisonChartProps> = ({
  player1,
  player2,
  statKey,
  title
}) => {
  const [seasonStats1, setSeasonStats1] = React.useState<PlayerStats[]>([]);
  const [seasonStats2, setSeasonStats2] = React.useState<PlayerStats[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchSeasonStats = async () => {
      try {
        setLoading(true);
        const currentYear = new Date().getFullYear();
        const seasons = Array.from({ length: 5 }, (_, i) => 
          `${currentYear - i}-${(currentYear - i + 1).toString().slice(-2)}`
        );

        const stats1 = await Promise.all(
          seasons.map(season => nbaApi.getPlayerStats(player1.id, season))
        );
        const stats2 = await Promise.all(
          seasons.map(season => nbaApi.getPlayerStats(player2.id, season))
        );

        setSeasonStats1(stats1);
        setSeasonStats2(stats2);
      } catch (error) {
        console.error('Error fetching season stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSeasonStats();
  }, [player1.id, player2.id]);

  const chartData = {
    labels: seasonStats1.map((_, index) => {
      const year = new Date().getFullYear() - index;
      return `${year}-${(year + 1).toString().slice(-2)}`;
    }).reverse(),
    datasets: [
      {
        label: player1.fullName,
        data: seasonStats1.map(stats => stats[statKey]).reverse(),
        borderColor: 'rgba(30, 60, 114, 1)',
        backgroundColor: 'rgba(30, 60, 114, 0.2)',
      },
      {
        label: player2.fullName,
        data: seasonStats2.map(stats => stats[statKey]).reverse(),
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: title,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    return <div className="loading">Loading season stats...</div>;
  }

  return (
    <div className="season-chart">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default SeasonComparisonChart; 