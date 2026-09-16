-- Um projeto concluído deixa de estar 100% concluído assim que recebe uma
-- tarefa pendente, seja por criação, vínculo ou reabertura da tarefa.
create or replace function public.reactivate_project_for_pending_task()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.project_id is not null and new.status <> 'done' and new.deleted_at is null then
    update public.projects
    set status = 'active', completion_ack = false
    where id = new.project_id
      and (status = 'completed' or completion_ack);
  end if;

  return new;
end;
$$;

create trigger tasks_reactivate_project_for_pending_task
after insert or update of status, project_id on public.tasks
for each row execute function public.reactivate_project_for_pending_task();
