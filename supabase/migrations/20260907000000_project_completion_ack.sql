-- Indica se o usuário optou explicitamente por manter o projeto em ativos
-- depois que todas as tarefas foram concluídas (destaca o botão "Manter em
-- ativos" na aba Visão Geral). Reseta para false sempre que uma tarefa do
-- projeto é reaberta, para que a próxima conclusão total peça uma nova decisão.
alter table public.projects
  add column completion_ack boolean not null default false;
