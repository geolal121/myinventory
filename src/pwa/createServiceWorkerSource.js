const hashAssetList = (assetPaths = []) => {
  return assetPaths.join('|').split('').reduce((hash, character) => {
    return ((hash << 5) - hash + character.charCodeAt(0)) >>> 0
  }, 0).toString(36)
}

export const createServiceWorkerSource = (assetPaths = []) => {
  const precacheUrls = [
    '/',
    '/manifest.webmanifest',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/apple-touch-icon.png',
    ...assetPaths,
  ]
  const uniquePrecacheUrls = Array.from(new Set(precacheUrls)).sort()
  const cacheName = `myinventory-shell-${hashAssetList(uniquePrecacheUrls)}`

  return `const CACHE_NAME = ${JSON.stringify(cacheName)}
const PRECACHE_URLS = ${JSON.stringify(uniquePrecacheUrls, null, 2)}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith('myinventory-shell-') &&
                cacheName !== CACHE_NAME,
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

const cacheResponse = async (request, response) => {
  if (!response || !response.ok || response.type !== 'basic') return response

  const cache = await caches.open(CACHE_NAME)
  await cache.put(request, response.clone())

  return response
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  const requestUrl = new URL(request.url)

  if (
    request.method !== 'GET' ||
    requestUrl.origin !== self.location.origin ||
    requestUrl.pathname === '/sw.js'
  ) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => cacheResponse(request, response))
        .catch(async () => {
          return (
            (await caches.match(request)) ||
            (await caches.match('/')) ||
            Response.error()
          )
        }),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse

      return fetch(request).then((response) => cacheResponse(request, response))
    }),
  )
})
`
}
