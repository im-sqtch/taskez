// Service worker mínimo: existe só para receber Web Push e reagir ao clique na
// notificação do sistema. Sem cache/offline de propósito — o app já é
// recarregado pela rede a cada visita, e cache indevido de bundles antigos
// causaria tela em branco após deploys.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }

  const title = data.title || 'TaskEz'
  const options = {
    body: data.body || '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: data.notificationId || undefined,
    data: { entityType: data.entityType || null, entityId: data.entityId || null },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const { entityType, entityId } = event.notification.data || {}
  const path = entityType === 'task' ? `/tasks/${entityId}` : entityType === 'project' ? `/projects/${entityId}` : '/dashboard'
  const targetUrl = new URL(path, self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((c) => 'focus' in c)
      if (existing) {
        if ('navigate' in existing) existing.navigate(targetUrl)
        return existing.focus()
      }
      return self.clients.openWindow(targetUrl)
    }),
  )
})
