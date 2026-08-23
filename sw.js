// Service worker: cachea el shell + datos semilla en la instalacion para que
// la app abra offline desde el primer uso, y sirve cache-first con relleno
// en segundo plano (stale-while-revalidate) para el resto. Los datos reales
// del usuario viven en localStorage (js/store.js), no en este cache.

// Sube este numero en cada deploy que toque algun archivo cacheado (css/js/
// icons/data) - si sw.js no cambia de bytes, el navegador nunca detecta que
// hay una version nueva que instalar y la app queda sirviendo la cache vieja.
const CACHE_VERSION = "v27";
const CACHE_NAME = `vocabulab-${CACHE_VERSION}`;

const SCOPE = self.registration.scope;
const u = (p) => new URL(p, SCOPE).toString();

const APP_SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/tokens.css",
  "css/app.css",
  "js/app.js",
  "js/router.js",
  "js/nav.js",
  "js/icons.js",
  "js/store.js",
  "js/translate.js",
  "js/palabraModal.js",
  "js/util/format.js",
  "js/views/ver.js",
  "js/views/traducir.js",
  "js/views/practicar.js",
  "js/views/frases.js",
  "js/views/examen.js",
  "js/views/ayuda.js",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "data/vocabulario.json",
  "data/frases.json",
].map(u);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn("[sw] fallo precacheando el shell completo:", err))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || !req.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
