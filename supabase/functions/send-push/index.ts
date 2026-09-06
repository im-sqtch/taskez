// Chamada pelo trigger "notifications_push_trigger" (via pg_net) sempre que uma
// linha é inserida em public.notifications. Busca as assinaturas Web Push do
// destinatário e envia a notificação real ao sistema operacional de cada
// dispositivo — o que faz o Android tocar o som padrão de notificação mesmo
// com o app fechado.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contato@taskez.app'
const PUSH_TRIGGER_SECRET = Deno.env.get('PUSH_TRIGGER_SECRET')!

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

interface NotifyRequest {
  user_id: string
  title: string
  body: string
  entity_type: 'task' | 'project' | null
  entity_id: string | null
  notification_id: string
}

Deno.serve(async (req) => {
  // Só o trigger de banco conhece este segredo — evita que qualquer um dispare
  // pushes arbitrários chamando a função publicamente.
  if (req.headers.get('x-push-secret') !== PUSH_TRIGGER_SECRET) {
    return new Response('Forbidden', { status: 403 })
  }

  const payload = (await req.json()) as NotifyRequest
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', payload.user_id)

  if (!subscriptions || subscriptions.length === 0) {
    return new Response('sem assinaturas', { status: 200 })
  }

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    entityType: payload.entity_type,
    entityId: payload.entity_id,
    notificationId: payload.notification_id,
  })

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, notificationPayload)
      } catch (err) {
        // 404/410 = o navegador revogou/expirou essa assinatura — remove para
        // não tentar de novo em toda notificação futura.
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }),
  )

  return new Response('ok', { status: 200 })
})
