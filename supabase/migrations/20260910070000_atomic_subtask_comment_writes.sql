-- Corrige corrida em subtasks/comments (jsonb): todas as mutações liam o
-- array do ESTADO LOCAL DO CLIENT (potencialmente desatualizado — o realtime
-- pode não ter chegado ainda), modificavam em memória e sobrescreviam a
-- coluna inteira. Dois membros comentando ou marcando subtarefas na mesma
-- tarefa ao mesmo tempo faziam o último UPDATE vencer e apagar
-- silenciosamente o que o outro tinha acabado de escrever — sem aviso, sem
-- volta, e sem o realtime salvar (o vencedor sobrescreve antes do evento do
-- perdedor sequer chegar).
--
-- Versão mínima: move a modificação do jsonb para dentro do banco, cada uma
-- numa única transação com `select ... for update` travando a linha — o
-- array de origem passa a ser sempre o que está no banco no momento exato da
-- escrita, nunca o cache do client. Não muda o formato dos dados (continuam
-- jsonb) nem a UI, só o CAMINHO de escrita: client -> RPC -> update atômico.
-- `security invoker` (padrão): roda com o papel de quem chama, a RLS de
-- `tasks` (membro do workspace) continua valendo normalmente.

create or replace function public.derive_task_status(p_current_status text, p_subtasks jsonb)
returns text
language sql
immutable
as $$
  select case
    when p_current_status = 'done' then p_current_status
    when jsonb_array_length(p_subtasks) < 2 then p_current_status
    when (select count(*) from jsonb_array_elements(p_subtasks) e where (e ->> 'done')::boolean) = 0 then 'todo'
    else 'in_progress'
  end;
$$;

create or replace function public.task_add_subtask(p_task_id uuid, p_subtask_id uuid, p_title text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_subtasks jsonb;
  v_status text;
begin
  select subtasks, status into v_subtasks, v_status from public.tasks where id = p_task_id for update;
  if not found then return; end if;

  v_subtasks := v_subtasks || jsonb_build_array(jsonb_build_object('id', p_subtask_id, 'title', p_title, 'done', false));

  update public.tasks
  set subtasks = v_subtasks, status = public.derive_task_status(v_status, v_subtasks), updated_at = now()
  where id = p_task_id;
end;
$$;

create or replace function public.task_edit_subtask(p_task_id uuid, p_subtask_id uuid, p_title text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_subtasks jsonb;
begin
  select subtasks into v_subtasks from public.tasks where id = p_task_id for update;
  if not found then return; end if;

  select coalesce(jsonb_agg(case when (e ->> 'id') = p_subtask_id::text then jsonb_set(e, '{title}', to_jsonb(p_title)) else e end), '[]'::jsonb)
  into v_subtasks
  from jsonb_array_elements(v_subtasks) e;

  update public.tasks set subtasks = v_subtasks, updated_at = now() where id = p_task_id;
end;
$$;

create or replace function public.task_toggle_subtask(p_task_id uuid, p_subtask_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_subtasks jsonb;
  v_status text;
begin
  select subtasks, status into v_subtasks, v_status from public.tasks where id = p_task_id for update;
  if not found then return; end if;

  select coalesce(
    jsonb_agg(case when (e ->> 'id') = p_subtask_id::text then jsonb_set(e, '{done}', to_jsonb(not (e ->> 'done')::boolean)) else e end),
    '[]'::jsonb
  )
  into v_subtasks
  from jsonb_array_elements(v_subtasks) e;

  update public.tasks
  set subtasks = v_subtasks, status = public.derive_task_status(v_status, v_subtasks), updated_at = now()
  where id = p_task_id;
end;
$$;

create or replace function public.task_remove_subtask(p_task_id uuid, p_subtask_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_subtasks jsonb;
  v_status text;
begin
  select subtasks, status into v_subtasks, v_status from public.tasks where id = p_task_id for update;
  if not found then return; end if;

  select coalesce(jsonb_agg(e), '[]'::jsonb) into v_subtasks
  from jsonb_array_elements(v_subtasks) e
  where (e ->> 'id') <> p_subtask_id::text;

  update public.tasks
  set subtasks = v_subtasks, status = public.derive_task_status(v_status, v_subtasks), updated_at = now()
  where id = p_task_id;
end;
$$;

create or replace function public.task_reorder_subtasks(p_task_id uuid, p_ordered_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_subtasks jsonb;
begin
  select subtasks into v_subtasks from public.tasks where id = p_task_id for update;
  if not found then return; end if;

  -- Reordena pelos ids pedidos; qualquer subtarefa que exista no banco mas não
  -- esteja na lista (ex.: adicionada por outro dispositivo entre a leitura do
  -- client e esta chamada) é preservada no fim, na ordem em que já estava —
  -- reordenar nunca deve apagar dado. `with ordinality` desempata a posição
  -- de quem ficou de fora, já que `array_position` sozinho não distingue
  -- duas subtarefas igualmente ausentes da lista.
  select coalesce(
    jsonb_agg(
      e.value
      order by coalesce(array_position(p_ordered_ids, (e.value ->> 'id')::uuid), coalesce(array_length(p_ordered_ids, 1), 0) + 1), e.ordinality
    ),
    '[]'::jsonb
  )
  into v_subtasks
  from jsonb_array_elements(v_subtasks) with ordinality as e (value, ordinality);

  update public.tasks set subtasks = v_subtasks, updated_at = now() where id = p_task_id;
end;
$$;

create or replace function public.task_add_comment(p_task_id uuid, p_comment_id uuid, p_author_id uuid, p_text text, p_created_at text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_comments jsonb;
begin
  select comments into v_comments from public.tasks where id = p_task_id for update;
  if not found then return; end if;

  v_comments := v_comments || jsonb_build_array(
    jsonb_build_object('id', p_comment_id, 'authorId', p_author_id, 'text', p_text, 'createdAt', p_created_at)
  );

  update public.tasks set comments = v_comments, updated_at = now() where id = p_task_id;
end;
$$;
