"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdapterFactory = void 0;
const NBAAdapter_js_1 = require("./NBAAdapter.js");
const WNBAAdapter_js_1 = require("./WNBAAdapter.js");
class AdapterRegistry {
    constructor() {
        this.ctors = new Map();
        this.instances = new Map();
    }
    /**
     * Register an adapter constructor under `key`.
     * Replaces any existing registration and clears the cached instance.
     */
    register(key, Ctor) {
        this.ctors.set(key, Ctor);
        this.instances.delete(key);
    }
    /**
     * Return the singleton adapter instance for `key`.
     * Instantiated lazily on first call; throws if no adapter is registered.
     */
    get(key) {
        if (!this.instances.has(key)) {
            const Ctor = this.ctors.get(key);
            if (!Ctor)
                throw new Error(`AdapterFactory: no adapter registered for league "${key}"`);
            this.instances.set(key, new Ctor());
        }
        return this.instances.get(key);
    }
    /** List all registered league keys (useful for health checks). */
    registeredKeys() {
        return [...this.ctors.keys()];
    }
}
exports.AdapterFactory = new AdapterRegistry();
// ── Default registrations ────────────────────────────────────────────────────
exports.AdapterFactory.register('nba', NBAAdapter_js_1.NBAAdapter);
exports.AdapterFactory.register('wnba', WNBAAdapter_js_1.WNBAAdapter);
