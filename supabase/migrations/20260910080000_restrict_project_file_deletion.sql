-- Restringe quem pode apagar projetos e arquivos — hoje qualquer membro do
-- workspace podia apagar o projeto ou arquivo de qualquer pessoa, mesmo algo
-- que não criou. Tarefas continuam abertas a qualquer membro (decisão de
-- produto: mantém o modelo colaborativo "mão na massa" que o app já tem).
--
-- Isto é só a Etapa 1 (travar permissões) de uma correção maior — lixeira/
-- soft-delete com restauração fica para uma entrega futura separada.

drop policy if exists "projects: membros removem" on public.projects;
create policy "projects: dono do workspace remove" on public.projects
  for delete using (public.is_workspace_owner(workspace_id));

drop policy if exists "files: membros removem" on public.files;
create policy "files: quem enviou ou dono do workspace remove" on public.files
  for delete using (uploaded_by = auth.uid() or public.is_workspace_owner(workspace_id));

-- Alinha o bucket com a mesma regra: o objeto físico só é removível por quem
-- também poderia remover a linha correspondente em `files` (join pelo path
-- completo — o UUID embutido no nome do objeto é gerado independente de
-- `files.id`, não dá pra comparar os dois diretamente).
drop policy if exists "project-files: membros removem" on storage.objects;
create policy "project-files: quem enviou ou dono do workspace remove" on storage.objects
  for delete using (
    bucket_id = 'project-files'
    and exists (
      select 1 from public.files f
      where f.storage_path = storage.objects.name
        and (f.uploaded_by = auth.uid() or public.is_workspace_owner(f.workspace_id))
    )
  );
