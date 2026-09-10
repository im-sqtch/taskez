-- Preferência de conta (Configurações > Tarefas concluídas): o que fazer quando
-- todas as tarefas de um projeto ativo são concluídas. `false` (padrão) mantém
-- o comportamento atual — pergunta na Visão Geral do projeto se ele deve ser
-- concluído ou continuar em ativos. `true` pula a pergunta e move o projeto
-- direto para Concluídos.
alter table public.profiles
  add column auto_complete_projects boolean not null default false;
