-- Agenda a purga definitiva (hard-delete) de tudo que está na lixeira há
-- mais de 30 dias — mesmo padrão já usado por scheduled_notifications: um
-- segredo compartilhado no Vault autentica a chamada via pg_net para a Edge
-- Function "purge-trash" (que precisa existir num serviço HTTP separado do
-- banco, não numa function SQL pura, porque só ela consegue apagar o blob
-- correspondente no Storage).

-- O segredo compartilhado usado para autenticar essa chamada (guardado no
-- Vault, não neste arquivo — este é um repositório público) é criado
-- separadamente com:
--   select vault.create_secret('<valor>', 'purge_trigger_secret');
-- e o MESMO valor precisa ser configurado na Edge Function via:
--   supabase secrets set PURGE_TRIGGER_SECRET=<valor>
-- (mesmo padrão já usado para push_trigger_secret/PUSH_TRIGGER_SECRET em
-- 20260906010000_push_notifications.sql).

create or replace function public.trigger_purge_trash()
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  trigger_secret text;
begin
  select decrypted_secret into trigger_secret from vault.decrypted_secrets where name = 'purge_trigger_secret';
  if trigger_secret is null then
    return;
  end if;

  perform net.http_post(
    url := 'https://fzidlcmkwjamuhsjacnd.supabase.co/functions/v1/purge-trash',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-purge-secret', trigger_secret),
    body := '{}'::jsonb
  );
end;
$$;

-- 3h da manhã (fuso do servidor, UTC) — fora do horário de pico de uso.
select cron.schedule('purge-trash', '0 3 * * *', 'select public.trigger_purge_trash();');
