-- Trava colunas sensíveis de `profiles`: a policy de update existente
-- (`auth.uid() = id`) autoriza a linha inteira — RLS não filtra colunas — e
-- isso permitia ao próprio usuário alterar `email` livremente. Como
-- `find_profile_by_email` resolve identidade por esse campo e ele tem
-- `unique`, dava para (a) sequestrar o e-mail de outra pessoa para aparecer
-- no lugar dela em "Adicionar contato", ou (b) ocupar o e-mail de alguém que
-- ainda não tem conta e travar o cadastro dela para sempre (unique
-- violation). `id` e `created_at` também não têm por que ser editáveis pelo
-- dono da linha.
--
-- GRANT column-level é a forma correta de restringir isso no Postgres — RLS
-- sozinha não alcança nível de coluna.

revoke update on public.profiles from authenticated;
grant update (name, avatar_color, usage_mode, timezone, auto_complete_projects) on public.profiles to authenticated;
