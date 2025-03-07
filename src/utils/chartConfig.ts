import { ChartOptions } from 'chart.js';

export const defaultChartOptions: ChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        font: {
          size: 12
        }
      }
    },
    tooltip: {
      mode: 'index',
      intersect: false,
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.1)'
      }
    },
    x: {
      grid: {
        display: false
      }
    }
  }
};

export const radarChartOptions: ChartOptions = {
  ...defaultChartOptions,
  scales: {
    r: {
      min: 0,
      max: 100,
      ticks: {
        display: false
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.1)'
      }
    }
  }
}; 