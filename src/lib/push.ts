import { supabase } from '@/lib/supabase'

// Chave pública VAPID — é para ser pública mesmo (vai embutida no bundle do
// cliente); a privada correspondente fica só como secret da Edge Function.
const VAPID_PUBLIC_KEY = 'BNtTftsjyMU72kx7neM7wN7-QKvA4QglIyAzzrBgs_lGtG9a6DNYVnaJ22YxtTlERU2SiQG3fWq4rEBGmCCsNAw'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false
  if (Notification.permission !== 'granted') return false
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  return subscription !== null
}

export async function subscribeToPush(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isPushSupported()) return { ok: false, error: 'Notificações push não são suportadas neste navegador.' }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { ok: false, error: 'Permissão de notificação negada.' }

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    return { ok: false, error: 'Assinatura de notificações inválida.' }
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }, { onConflict: 'endpoint' })

  if (error) return { ok: false, error: 'Não foi possível salvar a assinatura de notificações.' }
  return { ok: true }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  await subscription.unsubscribe()
}
