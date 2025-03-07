import { Player } from './player';

export interface StatTrend {
  direction: 'up' | 'down' | 'stable';
  percentage: number;
}

export interface ImpactFactor {
  name: string;
  impact: number;
  description: string;
}

export interface SimilarPlayer {
  id: string;
  name: string;
  similarity: number;
}

export interface PredictionResult {
  player: Player;
  confidenceScore: number;
  historicalStats: Record<string, number[]>;
  predictedStats: Record<string, number>;
  trends: Record<string, StatTrend>;
  impactFactors: ImpactFactor[];
  similarPlayers: SimilarPlayer[];
} 