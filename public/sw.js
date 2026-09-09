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
  // Convênio 'pomodoro:<id>' no entityType: essa notificação substitui a
  // notificação "em andamento" daquele timer (mesmo tag) em vez de empilhar
  // uma nova — e `renotify` garante som/vibração mesmo substituindo.
  const pomodoroId = typeof data.entityType === 'string' && data.entityType.startsWith('pomodoro:') ? data.entityType.slice('pomodoro:'.length) : null
  const options = {
    body: data.body || '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: pomodoroId ? `pomodoro-${pomodoroId}` : data.notificationId || undefined,
    renotify: Boolean(pomodoroId),
    data: { entityType: data.entityType || null, entityId: data.entityId || null },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  const { action, notification } = event
  const pomodoroId = notification.data?.pomodoroId

  // Botões "Pausar"/"Encerrar" da notificação estática do Pomodoro: o estado
  // de verdade só existe dentro de uma página aberta (o Service Worker não
  // acessa o localStorage do app), então repassa a ação via postMessage para
  // um client já aberto ou, na falta de um, abre o app com a ação na URL.
  if (action === 'pomodoro-pause' || action === 'pomodoro-stop') {
    event.notification.close()
    if (!pomodoroId) return
    const kind = action === 'pomodoro-pause' ? 'pause' : 'stop'
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        const existing = clientList.find((c) => 'focus' in c)
        if (existing) {
          existing.postMessage({ type: 'pomodoro-action', action: kind, id: pomodoroId })
          return existing.focus()
        }
        return self.clients.openWindow(`/?pomodoroAction=${kind}&pomodoroId=${pomodoroId}`)
      }),
    )
    return
  }

  event.notification.close()

  const { entityType, entityId } = notification.data || {}
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
