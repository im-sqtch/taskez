-- Permite que uma notificação aponte para a tarefa/projeto a que se refere, para
-- que o clique nela leve o usuário direto à página correspondente. Sem FK (o tipo
-- de entidade varia entre tabelas) — se a entidade já tiver sido excluída, o
-- cliente simplesmente não navega.
alter table public.notifications
  add column entity_type text,
  add column entity_id uuid;
