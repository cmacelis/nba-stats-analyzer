import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export type PropType = 'points' | 'rebounds' | 'assists' | 'combined';
export type Prediction = 'over' | 'under' | 'neutral';

export interface StatContext {
  propLine: number;
  recentAvg5: number;
  recentAvg10: number;
  stdDev: number;
  overHitRate: number;   // 0–1
  streak: number;        // +N = N consecutive overs, -N = N consecutive unders
  recentGames: number[]; // last 10 values, most recent first
  gamesPlayed: number;
}

export interface ResearchReport {
  playerName: string;
  propType: PropType;
  prediction: Prediction;
  confidence: number;    // 0–1
  reasoning: string;
  keyFactors: string[];
  sentimentWeight: string;
  statWeight: string;
  generatedAt: string;
  expiresAt: string;
  simulated: boolean;
  cached: boolean;
  statContext?: StatContext;
}

export const researchApi = {
  getReport: async (
    playerName: string,
    prop: PropType = 'points',
    forceRefresh = false
  ): Promise<ResearchReport> => {
    const params = new URLSearchParams({ prop });
    if (forceRefresh) params.set('refresh', 'true');
    const res = await axios.get(
      `${API_BASE}/api/research/${encodeURIComponent(playerName)}?${params}`
    );
    return res.data;
  },

  generateReport: async (
    playerName: string,
    prop: PropType = 'points'
  ): Promise<ResearchReport> => {
    const res = await axios.post(`${API_BASE}/api/research/generate`, { playerName, prop });
    return res.data;
  },
};

export default researchApi;
