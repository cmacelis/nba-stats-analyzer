/**
 * LeagueAdapterFactory
 * 
 * Central registry for league adapters. Enables multi-league support with
 * pluggable implementations.
 * 
 * Phase 0: Registers NBAAdapter
 * Phase 1+: WNBA, other leagues
 */

import { League, ILeagueAdapter } from './types';

interface AdapterClass {
  new (): ILeagueAdapter;
}

export class LeagueAdapterFactory {
  private static adapters: Map<League, AdapterClass> = new Map();
  private static instances: Map<League, ILeagueAdapter> = new Map();

  /**
   * Register a new adapter class for a league
   * Called at application startup
   */
  static register(league: League, adapterClass: AdapterClass): void {
    if (this.adapters.has(league)) {
      console.warn(`[AdapterFactory] Overwriting existing adapter for league: ${league}`);
    }
    this.adapters.set(league, adapterClass);
    console.log(`[AdapterFactory] Registered adapter for league: ${league}`);
  }

  /**
   * Create or return cached instance of adapter
   */
  static create(league: League): ILeagueAdapter {
    // Return cached instance if available
    if (this.instances.has(league)) {
      return this.instances.get(league)!;
    }

    const AdapterClass = this.adapters.get(league);
    if (!AdapterClass) {
      throw new Error(
        `No adapter registered for league: ${league}. Supported: ${Array.from(this.adapters.keys()).join(', ')}`
      );
    }

    // Create new instance and cache it
    const instance = new AdapterClass();
    this.instances.set(league, instance);
    return instance;
  }

  /**
   * Check if a league is supported
   */
  static isSupported(league: League | string): boolean {
    return this.adapters.has(league as League);
  }

  /**
   * Get all supported leagues
   */
  static getSupportedLeagues(): League[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Clear cached instances (for testing or resets)
   */
  static clearCache(): void {
    this.instances.clear();
    console.log('[AdapterFactory] Cleared all cached adapter instances');
  }

  /**
   * Get instance directly (cached)
   */
  static getInstance(league: League): ILeagueAdapter | null {
    return this.instances.get(league) || null;
  }
}
