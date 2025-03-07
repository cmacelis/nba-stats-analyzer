import { cacheService } from './cacheService';
import { ErrorLogger } from '../utils/errorLogger';
import { withRetry } from '../utils/apiRetry';
import { Player, PlayerStats } from '../types/player';
import { PredictionResult } from '../types/prediction';
import { RateLimit } from 'async-sema';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';
const rateLimiter = new RateLimit(5);

export class AIStatsService {
  private async makeRequest<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    await rateLimiter.acquire();
    try {
      const response = await withRetry(() => 
        axios.get<T>(`${API_BASE_URL}${endpoint}`, { params })
      );
      return response.data;
    } finally {
      rateLimiter.release();
    }
  }

  async getPrediction(playerId: string): Promise<PredictionResult> {
    try {
      const cacheKey = `prediction_${playerId}`;
      const cached = await cacheService.get<PredictionResult>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const prediction = await this.makeRequest<PredictionResult>(
        `/predictions/${playerId}`
      );
      
      await cacheService.set(cacheKey, prediction, 5 * 60);
      return prediction;
    } catch (error) {
      ErrorLogger.log(error as Error, 'high');
      throw new Error('Failed to fetch prediction');
    }
  }

  async predictPlayerPerformance(playerId: string): Promise<PredictionResult> {
    try {
      const response = await this.makeRequest<PredictionResult>('/predictions', {
        playerId,
        factors: ['recent_form', 'matchup_history', 'rest_days']
      });
      return response;
    } catch (error) {
      ErrorLogger.log(error as Error, 'high');
      throw new Error('Failed to predict player performance');
    }
  }
}

export const aiStatsService = new AIStatsService(); 