// Clothet Service Worker: macht die App offline nutzbar.
// Seitenaufrufe: erst Netz (damit Updates ankommen), ohne Netz aus dem Cache.
// Dateien mit Hash im Namen, Icons und Schriften: erst Cache, sonst Netz.
// Eine neue Version wartet, bis die App "skip-waiting" schickt (Hinweis "Neue Version" in der App).
// ASSETS und VERSION setzt der Build ein (vite.config.ts): alle Dateien der App, damit sie schon nach dem ersten Besuch offline startet.
const ASSETS = self.__ASSETS__
const CACHE = 'clothet-' + self.__VERSION__
const SHELL = ['./', './manifest.webmanifest', './icon-192.png', './apple-touch-icon.png', ...ASSETS]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)))
})

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  const store = (res) => {
    if (res && res.ok) {
      const copy = res.clone()
      caches.open(CACHE).then((c) => c.put(req, copy))
    }
    return res
  }

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then(store).catch(() => caches.match(req, { ignoreVary: true }).then((r) => r || caches.match('./', { ignoreVary: true }))))
    return
  }
  event.respondWith(caches.match(req, { ignoreVary: true }).then((hit) => hit || fetch(req).then(store)))
})
