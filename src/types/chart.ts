import { ChartData, ChartDataset } from 'chart.js';

export interface CustomChartDataset extends ChartDataset<'line', number[]> {
  borderDash?: number[];
  pointBackgroundColor?: string;
  pointRadius?: number[];
  showLine?: boolean;
}

export interface CustomChartData extends ChartData<'line', number[]> {
  datasets: CustomChartDataset[];
} 