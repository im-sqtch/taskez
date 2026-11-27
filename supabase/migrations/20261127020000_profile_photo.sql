-- Foto de perfil.
-- profiles.avatar_url: URL pública da foto (bucket "avatars"); sem ela, o
--   app mostra as iniciais na cor do perfil, como antes.
-- team_members.avatar_url: cópia nas entradas da equipe ligadas à conta, para
--   colegas verem a foto nas tarefas, no chat e na equipe.
alter table public.profiles
  add column avatar_url text check (avatar_url is null or avatar_url ~ '^https://');
grant update (avatar_url) on public.profiles to authenticated;

alter table public.team_members
  add column avatar_url text check (avatar_url is null or avatar_url ~ '^https://');

-- Bucket público (só leitura pública): cada pessoa só grava na própria pasta.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars: dono envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: dono atualiza" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: dono remove" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
