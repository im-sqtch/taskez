-- Uma reação por usuário em cada mensagem ou comentário. Comentários vivem no
-- JSON da tarefa, por isso comment_id é validado pela RPC antes da gravação.
create table public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  chat_message_id uuid references public.chat_messages (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete cascade,
  comment_id uuid,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null check (emoji in ('👍', '❤️', '😂', '😮', '😢', '🙏')),
  created_at timestamptz not null default now(),
  constraint reaction_target_check check (
    (chat_message_id is not null and task_id is null and comment_id is null)
    or (chat_message_id is null and task_id is not null and comment_id is not null)
  )
);

create unique index message_reactions_chat_user_idx
  on public.message_reactions (chat_message_id, user_id)
  where chat_message_id is not null;
create unique index message_reactions_comment_user_idx
  on public.message_reactions (task_id, comment_id, user_id)
  where task_id is not null;
create index message_reactions_workspace_id_idx on public.message_reactions (workspace_id);

alter table public.message_reactions enable row level security;
create policy "message_reactions: membros veem" on public.message_reactions
  for select using (public.is_workspace_member(workspace_id));
grant select on public.message_reactions to authenticated;

alter table public.message_reactions replica identity full;
alter publication supabase_realtime add table public.message_reactions;

-- A RPC valida o alvo e a identidade do usuário. Escritas diretas na tabela
-- não têm policy, para impedir reações forjadas e notificações arbitrárias.
create function public.toggle_message_reaction(
  p_chat_message_id uuid,
  p_task_id uuid,
  p_comment_id uuid,
  p_emoji text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_author_id uuid;
  v_existing public.message_reactions%rowtype;
  v_target_name text;
  v_reactor_name text;
  v_entity_type text;
  v_entity_id uuid;
begin
  if auth.uid() is null or p_emoji is null or p_emoji not in ('👍', '❤️', '😂', '😮', '😢', '🙏') then
    raise exception 'invalid reaction';
  end if;

  if p_chat_message_id is not null and p_task_id is null and p_comment_id is null then
    select m.workspace_id, tm.linked_user_id, p.name, p.id
      into v_workspace_id, v_author_id, v_target_name, v_entity_id
    from public.chat_messages m
    join public.projects p on p.id = m.project_id and p.workspace_id = m.workspace_id
    left join public.team_members tm on tm.id = m.author_id and tm.workspace_id = m.workspace_id
    where m.id = p_chat_message_id and p.deleted_at is null;
    v_entity_type := 'project_chat';
  elsif p_chat_message_id is null and p_task_id is not null and p_comment_id is not null then
    select t.workspace_id, t.title, t.id
      into v_workspace_id, v_target_name, v_entity_id
    from public.tasks t
    where t.id = p_task_id and t.deleted_at is null
      and exists (
        select 1 from jsonb_array_elements(t.comments) c
        where c->>'id' = p_comment_id::text
      );

    if v_workspace_id is not null then
      select coalesce(tm.linked_user_id, profile.id)
        into v_author_id
      from public.tasks t
      cross join lateral jsonb_array_elements(t.comments) c
      left join public.team_members tm on tm.id::text = c->>'authorId' and tm.workspace_id = t.workspace_id
      left join public.profiles profile on profile.id::text = c->>'authorId'
      where t.id = p_task_id and c->>'id' = p_comment_id::text;
    end if;
    v_entity_type := 'task';
  else
    raise exception 'invalid reaction target';
  end if;

  if v_workspace_id is null or not public.is_workspace_member(v_workspace_id) then
    raise exception 'reaction target unavailable';
  end if;

  select * into v_existing
  from public.message_reactions
  where user_id = auth.uid()
    and (
      (p_chat_message_id is not null and chat_message_id = p_chat_message_id)
      or (p_task_id is not null and task_id = p_task_id and comment_id = p_comment_id)
    )
  for update;

  if found and v_existing.emoji = p_emoji then
    delete from public.message_reactions where id = v_existing.id;
    return;
  elsif found then
    update public.message_reactions
      set emoji = p_emoji, created_at = now()
      where id = v_existing.id;
  else
    insert into public.message_reactions
      (workspace_id, chat_message_id, task_id, comment_id, user_id, emoji)
    values
      (v_workspace_id, p_chat_message_id, p_task_id, p_comment_id, auth.uid(), p_emoji);
  end if;

  if v_author_id is not null and v_author_id <> auth.uid()
    and exists (
      select 1 from public.workspace_members
      where workspace_id = v_workspace_id and user_id = v_author_id
    )
  then
    select name into v_reactor_name from public.profiles where id = auth.uid();
    insert into public.notifications
      (user_id, workspace_id, type, title, body, entity_type, entity_id)
    values (
      v_author_id, v_workspace_id,
      case when v_entity_type = 'project_chat' then 'project' else 'task' end,
      'Nova reação',
      coalesce(v_reactor_name, 'Alguém') || ' reagiu com ' || p_emoji
        || case when v_entity_type = 'project_chat'
          then ' à sua mensagem em "' || v_target_name || '".'
          else ' ao seu comentário em "' || v_target_name || '".'
        end,
      v_entity_type, v_entity_id
    );
  end if;
end;
$$;

revoke all on function public.toggle_message_reaction(uuid, uuid, uuid, text) from public;
grant execute on function public.toggle_message_reaction(uuid, uuid, uuid, text) to authenticated;
