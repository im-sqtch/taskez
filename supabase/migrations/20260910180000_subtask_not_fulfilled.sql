-- Estende o ciclo de 3 cliques (check verde -> X vermelho -> vazio, ver
-- 20260910170000_task_not_fulfilled.sql) para subtarefas. Como `subtasks` é
-- jsonb (sem coluna própria por item), o campo `notFulfilled` mora dentro de
-- cada elemento do array, ao lado de `done` — `done` continua o único campo
-- que conta para `derive_task_status` e para o contador de progresso na UI;
-- `notFulfilled` é só o desenho de qual dos dois estados "concluído" mostrar.
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
    jsonb_agg(
      case
        when (e ->> 'id') <> p_subtask_id::text then e
        when not (e ->> 'done')::boolean then jsonb_set(jsonb_set(e, '{done}', 'true'), '{notFulfilled}', 'false')
        when not coalesce((e ->> 'notFulfilled')::boolean, false) then jsonb_set(e, '{notFulfilled}', 'true')
        else jsonb_set(jsonb_set(e, '{done}', 'false'), '{notFulfilled}', 'false')
      end
    ),
    '[]'::jsonb
  )
  into v_subtasks
  from jsonb_array_elements(v_subtasks) e;

  update public.tasks
  set subtasks = v_subtasks, status = public.derive_task_status(v_status, v_subtasks), updated_at = now()
  where id = p_task_id;
end;
$$;
