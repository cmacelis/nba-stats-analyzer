/// <reference path="./types/serviceWorker.d.ts" />
/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

import { indexedDBService } from './services/indexedDBService';

const CACHE_NAME = 'nba-stats-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/js/main.js',
  '/static/css/main.css',
];

const API_CACHE_NAME = 'nba-stats-api-v1';
const API_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('nba-stats-'))
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Static assets
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request).then((response) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, response.clone());
          return response;
        });
      });
    })
  );
});

async function handleApiRequest(request: Request): Promise<Response> {
  try {
    // Try network first
    const response = await fetch(request);
    const cache = await caches.open(API_CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    // If offline, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Handle background sync for offline mutations
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'sync-favorites') {
    event.waitUntil(syncFavorites());
  }
});

async function syncFavorites() {
  const pendingFavorites = await indexedDBService.getAll('pendingFavorites');
  
  for (const favorite of pendingFavorites) {
    try {
      await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(favorite),
      });
      await indexedDBService.delete('pendingFavorites', favorite.id);
    } catch (error) {
      console.error('Failed to sync favorite:', error);
    }
  }
} 