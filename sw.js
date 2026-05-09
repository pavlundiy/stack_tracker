const CACHE_VERSION = "stackup-pwa-v2-20260509";
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

const APP_SHELL = [
  "./",
  "./manifest.webmanifest",
  "./icons/apple-touch-icon.png",
  "./icons/stackup-icon-192.png",
  "./icons/stackup-icon-512.png",
  "./icons/stackup-icon-192.svg",
  "./icons/stackup-icon-512.svg",
  "./stack_tracker%209%20refreshed.html",
  "./stack_tracker%209.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(async () => {
          const cachedPage = await caches.match(req);
          if (cachedPage) return cachedPage;
          return (
            (await caches.match("./stack_tracker%209%20refreshed.html")) ||
            (await caches.match("./stack_tracker%209.html")) ||
            Response.error()
          );
        })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkPromise = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached);
      return cached || networkPromise;
    })
  );
});
