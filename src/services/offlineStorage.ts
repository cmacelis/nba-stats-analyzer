import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Player, PlayerStats } from '../types/nba';
import { ErrorLogger } from '../utils/errorLogger';

interface NBADBSchema extends DBSchema {
  players: {
    key: string;
    value: Player;
    indexes: { 'by-name': string };
  };
  stats: {
    key: string;
    value: PlayerStats;
    indexes: { 'by-player': string };
  };
  syncQueue: {
    key: number;
    value: {
      action: 'create' | 'update' | 'delete';
      collection: string;
      data: any;
      timestamp: number;
    };
    indexes: { 'by-timestamp': number };
  };
}

class OfflineStorage {
  private db: IDBPDatabase<NBADBSchema> | null = null;

  async init(): Promise<void> {
    this.db = await openDB<NBADBSchema>('nba-stats', 1, {
      upgrade(db) {
        // Players store
        const playerStore = db.createObjectStore('players', { keyPath: 'id' });
        playerStore.createIndex('by-name', 'fullName');

        // Stats store
        const statsStore = db.createObjectStore('stats', { keyPath: 'id' });
        statsStore.createIndex('by-player', 'playerId');

        // Sync queue store
        const syncStore = db.createObjectStore('syncQueue', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        syncStore.createIndex('by-timestamp', 'timestamp');
      },
    });
  }

  async savePlayer(player: Player): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('players', player);
    await this.addToSyncQueue('create', 'players', player);
  }

  async getPlayer(id: string): Promise<Player | undefined> {
    if (!this.db) await this.init();
    return this.db!.get('players', id);
  }

  async saveStats(stats: PlayerStats): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('stats', stats);
    await this.addToSyncQueue('create', 'stats', stats);
  }

  private async addToSyncQueue(
    action: 'create' | 'update' | 'delete',
    collection: string,
    data: any
  ): Promise<void> {
    await this.db!.add('syncQueue', {
      action,
      collection,
      data,
      timestamp: Date.now()
    });
  }

  async processSyncQueue(): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction('syncQueue', 'readwrite');
    const index = tx.store.index('by-timestamp');
    
    let cursor = await index.openCursor();
    
    while (cursor) {
      // Process each item in the queue
      const item = cursor.value;
      try {
        // Attempt to sync with server
        // If successful, delete from queue
        await tx.store.delete(cursor.primaryKey);
      } catch (error) {
        console.error('Failed to sync item:', error);
      }
      cursor = await cursor.continue();
    }
  }

  async syncData() {
    if (!navigator.onLine) return;
    
    const pendingUpdates = await this.db.getAll('pendingUpdates');
    for (const update of pendingUpdates) {
      try {
        await this.syncItem(update);
        await this.db.delete('pendingUpdates', update.id);
      } catch (error) {
        ErrorLogger.log(error as Error, 'medium');
      }
    }
  }
}

export const offlineStorage = new OfflineStorage(); 