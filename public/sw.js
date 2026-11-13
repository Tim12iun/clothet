// Clothet Service Worker: macht die App offline nutzbar.
// Seitenaufrufe: erst Netz (damit Updates ankommen), ohne Netz aus dem Cache.
// Dateien mit Hash im Namen, Icons und Schriften: erst Cache, sonst Netz.
const CACHE = 'clothet-v1'
const SHELL = ['./', './manifest.webmanifest', './icon-192.png', './apple-touch-icon.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com']

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  const own = url.origin === self.location.origin
  if (!own && !FONT_HOSTS.includes(url.hostname)) return

  const store = (res) => {
    if (res && (res.ok || res.type === 'opaque')) {
      const copy = res.clone()
      caches.open(CACHE).then((c) => c.put(req, copy))
    }
    return res
  }

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then(store).catch(() => caches.match(req).then((r) => r || caches.match('./'))))
    return
  }
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then(store)))
})
