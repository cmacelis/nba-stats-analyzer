/**
 * AdapterFactory — Phase 0.5
 *
 * Singleton registry for ILeagueAdapter implementations.
 * Pre-registers NBAAdapter under the key "nba".
 *
 * Usage:
 *   import { AdapterFactory } from './_adapters/AdapterFactory.js';
 *   const nba = AdapterFactory.get('nba');
 *   const results = await nba.playerSearch('Luka');
 */

import type { ILeagueAdapter } from '../../src/adapters/types.js';
import { NBAAdapter } from './NBAAdapter.js';

type AdapterCtor = new () => ILeagueAdapter;

class AdapterRegistry {
  private readonly ctors = new Map<string, AdapterCtor>();
  private readonly instances = new Map<string, ILeagueAdapter>();

  /**
   * Register an adapter constructor under `key`.
   * Replaces any existing registration and clears the cached instance.
   */
  register(key: string, Ctor: AdapterCtor): void {
    this.ctors.set(key, Ctor);
    this.instances.delete(key);
  }

  /**
   * Return the singleton adapter instance for `key`.
   * Instantiated lazily on first call; throws if no adapter is registered.
   */
  get(key: string): ILeagueAdapter {
    if (!this.instances.has(key)) {
      const Ctor = this.ctors.get(key);
      if (!Ctor) throw new Error(`AdapterFactory: no adapter registered for league "${key}"`);
      this.instances.set(key, new Ctor());
    }
    return this.instances.get(key)!;
  }

  /** List all registered league keys (useful for health checks). */
  registeredKeys(): string[] {
    return [...this.ctors.keys()];
  }
}

export const AdapterFactory = new AdapterRegistry();

// ── Default registrations ────────────────────────────────────────────────────
AdapterFactory.register('nba', NBAAdapter);
