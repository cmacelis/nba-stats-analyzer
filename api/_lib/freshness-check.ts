/**
 * Minimal data freshness check for edge generation
 * Returns: 'complete' | 'incomplete' | 'unknown'
 */

import { bdlGet } from '../_lib.js';
import { edgeConfig } from '../_config/edge.js';

export type FreshnessStatus = 'complete' | 'incomplete' | 'unknown';

/**
 * Check if data for a given date is complete enough for edge generation
 * @param date ISO date string (YYYY-MM-DD)
 * @returns Freshness status
 */
export async function checkDataFreshness(date: string): Promise<FreshnessStatus> {
  try {
    // Query BallDontLie for games on the target date
    const data = await bdlGet('/games', {
      start_date: date,
      end_date: date,
      per_page: 50, // Enough for a full day of NBA games
    }).catch(() => null);

    if (!data?.data || !Array.isArray(data.data)) {
      return 'unknown';
    }

    const games = data.data;
    if (games.length === 0) {
      // No games scheduled for this date
      return 'complete';
    }

    // Count final vs non-final games
    const finalGames = games.filter(game => game.status === 'Final');
    const completionPercentage = (finalGames.length / games.length) * 100;

    return completionPercentage >= edgeConfig.dataCompletionThreshold 
      ? 'complete' 
      : 'incomplete';

  } catch (error) {
    console.warn(`[freshness-check] Error checking data freshness for ${date}:`, error);
    return 'unknown';
  }
}

/**
 * Simple wrapper that returns freshness status
 * Used in edge generation pipeline
 */
export async function getFreshnessStatus(date: string): Promise<FreshnessStatus> {
  return checkDataFreshness(date);
}