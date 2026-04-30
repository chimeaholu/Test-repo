const STATIC_CACHE = "agrodomain-static-v1";
const DOCUMENT_CACHE = "agrodomain-documents-v1";
const RUNTIME_CACHE = "agrodomain-runtime-v1";
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/icon.svg",
  "/signin",
  "/",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                ![STATIC_CACHE, DOCUMENT_CACHE, RUNTIME_CACHE].includes(key),
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isCachableAsset(request) {
  return ["document", "font", "image", "script", "style"].includes(
    request.destination,
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            void caches
              .open(DOCUMENT_CACHE)
              .then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(async () => {
          const cachedDocument = await caches.match(request);
          if (cachedDocument) {
            return cachedDocument;
          }

          return (
            (await caches.match(OFFLINE_URL)) ||
            new Response("Offline", { status: 503 })
          );
        }),
    );
    return;
  }

  if (!isCachableAsset(request)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkResponse = fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            void caches
              .open(RUNTIME_CACHE)
              .then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkResponse;
    }),
  );
});
