/**
 * LocalLLMMind Service Worker
 * Provides offline caching for app shell and static assets.
 * Network-first strategy for API calls, cache-first for static assets.
 * Engineered by Kapil Kumar Yadav
 */

const CACHE_NAME = 'localllmmind-cache-v1';

// App shell assets to pre-cache
const APP_SHELL = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
];

// Install: pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch((err) => {
        console.warn('[SW] Pre-cache partial failure (expected in dev):', err);
      });
    })
  );
  // Skip waiting so new SW activates immediately
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Ollama API calls (always need fresh data)
  if ((url.pathname.startsWith('/api/') || url.pathname.startsWith('/local-api/'))) return;

  // Skip WebSocket and browser-extension requests
  if (url.protocol === 'chrome-extension:' || url.protocol === 'ws:' || url.protocol === 'wss:') return;

  // For navigation requests (HTML pages), network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // For static assets (JS, CSS, images, fonts), cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          // Only cache successful responses from our origin
          if (response.ok && url.origin === self.location.origin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Return nothing for failed asset loads
          return new Response('', { status: 408, statusText: 'Offline' });
        });
    })
  );
});
