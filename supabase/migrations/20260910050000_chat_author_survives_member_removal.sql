-- `chat_messages.author_id` referenciava `team_members(id) on delete cascade`.
-- Remover um membro da equipe (removeTeamMember, dataStore.ts) apagava, em
-- cascata e silenciosamente, TODAS as mensagens que essa pessoa já tinha
-- escrito em qualquer chat de projeto do workspace — histórico de decisões
-- de equipe destruído por um clique em "remover membro", sem aviso e sem
-- volta.
--
-- Troca para `on delete set null`: a mensagem sobrevive, só perde o vínculo
-- com o autor removido. O client já tolera `author_id` ausente com um
-- fallback de exibição em ProjectChat.tsx (autorFor -> "Ex-membro").

alter table public.chat_messages
  drop constraint chat_messages_author_id_fkey,
  alter column author_id drop not null,
  add constraint chat_messages_author_id_fkey
    foreign key (author_id) references public.team_members (id) on delete set null;
