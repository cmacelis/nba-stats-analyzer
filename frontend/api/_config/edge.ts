/**
 * Edge generation configuration
 * Configurable via environment variables with sensible defaults
 */

export interface EdgeConfig {
  // Cache TTLs in seconds
  emptyTTL: number;      // TTL for empty results (edgeCount = 0)
  lowTTL: number;        // TTL for low results (edgeCount < lowThreshold)
  normalTTL: number;     // TTL for normal results
  
  // Thresholds
  lowThreshold: number;  // Below this count is considered "low"
  
  // Freshness check
  dataCompletionThreshold: number; // Percentage of games that must be final
  freshnessCheckTimeout: number;   // Timeout for freshness check in ms
}

export const edgeConfig: EdgeConfig = {
  // Cache TTLs (seconds)
  emptyTTL: parseInt(process.env.EDGE_EMPTY_TTL || '300'),      // 5 minutes
  lowTTL: parseInt(process.env.EDGE_LOW_TTL || '1800'),        // 30 minutes
  normalTTL: parseInt(process.env.EDGE_NORMAL_TTL || '86400'), // 24 hours
  
  // Thresholds
  lowThreshold: parseInt(process.env.EDGE_LOW_THRESHOLD || '3'),
  
  // Freshness check
  dataCompletionThreshold: parseInt(process.env.DATA_COMPLETION_THRESHOLD || '80'), // 80%
  freshnessCheckTimeout: parseInt(process.env.FRESHNESS_CHECK_TIMEOUT || '5000'),   // 5 seconds
};

/**
 * Get cache TTL based on edge count and freshness status
 */
export function getCacheTTL(edgeCount: number, freshnessStatus: 'complete' | 'incomplete' | 'unknown'): number {
  let ttl: number;
  
  if (edgeCount === 0) {
    ttl = edgeConfig.emptyTTL;
  } else if (edgeCount < edgeConfig.lowThreshold) {
    ttl = edgeConfig.lowTTL;
  } else {
    ttl = edgeConfig.normalTTL;
  }
  
  // Halve TTL for incomplete data (extra caution)
  if (freshnessStatus === 'incomplete') {
    ttl = Math.floor(ttl / 2);
  }
  
  return ttl;
}