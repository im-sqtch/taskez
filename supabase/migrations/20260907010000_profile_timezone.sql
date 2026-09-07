-- Fuso horário do usuário, detectado automaticamente no cadastro (frontend
-- envia via raw_user_meta_data) para que ele nunca precise configurar isso
-- manualmente. Pode ser ajustado depois em Configurações.
alter table public.profiles
  add column timezone text not null default 'UTC';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, avatar_color, usage_mode, timezone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'avatar_color', '#7C5CFF'),
    'personal',
    coalesce(new.raw_user_meta_data ->> 'timezone', 'UTC')
  );
  return new;
end;
$$;
