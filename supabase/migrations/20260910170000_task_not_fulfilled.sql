-- Ciclo de 3 cliques no círculo de conclusão da tarefa (vazio -> cumprida ->
-- concluída sem cumprir -> vazio): `status` continua só `todo`/`in_progress`/
-- `done` como antes (nenhuma lógica de conclusão de projeto muda), esta
-- coluna guarda apenas qual dos dois desenhos mostrar quando `status = 'done'`
-- (`false` = check verde, `true` = X vermelho).
alter table public.tasks
  add column not_fulfilled boolean not null default false;
