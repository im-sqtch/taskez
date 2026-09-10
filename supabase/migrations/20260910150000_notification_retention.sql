-- Correção #17: notificações cresciam indefinidamente e eram carregadas SEM
-- filtro nem limite em todo seedIfEmpty() — em meses de uso, a carga
-- inicial ficava inviável. Retenção de 30 dias para todas as notificações,
-- lidas ou não (decisão explícita do usuário — sem exceção pra não lidas).
--
-- Puramente SQL (diferente de purge-trash): não envolve Storage nem nenhum
-- recurso fora do Postgres, não precisa de Edge Function nem de segredo —
-- roda direto via pg_cron, mesmo padrão de dispatch_scheduled_notifications.

create or replace function public.purge_old_notifications()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.notifications where created_at < now() - interval '30 days';
$$;

select cron.schedule('purge-old-notifications', '0 4 * * *', 'select public.purge_old_notifications();');
