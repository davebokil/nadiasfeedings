// Service worker: shows push notifications sent by functions/index.js. No offline caching here.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('push', e => {
  let data = {}
  try { data = e.data ? e.data.json() : {} } catch { data = { body: e.data && e.data.text() } }
  e.waitUntil(self.registration.showNotification(data.title || "Nadia's Feedings", {
    body: data.body || 'A feeding was added',
    tag: data.tag,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
  }))
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    if (wins[0]) return wins[0].focus()
    return self.clients.openWindow(self.registration.scope)
  })())
})
