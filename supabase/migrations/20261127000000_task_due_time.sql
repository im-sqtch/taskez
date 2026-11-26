-- Horário opcional no prazo das tarefas. O dia continua em `due_date`
-- (meia-noite UTC do dia escolhido, como sempre); o horário fica à parte, em
-- "HH:MM" no fuso de quem vê, para não mexer em nada que já lê só a data.
alter table public.tasks
  add column due_time text
  check (due_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
