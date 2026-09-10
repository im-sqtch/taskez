-- Correção #16: o limite de 10 MB por arquivo (ProjectFiles.tsx, FilesPage.tsx)
-- só existia checado no client — sem `file_size_limit` no bucket, a anon key
-- permite subir qualquer tamanho via API direta, sem passar pela tela de
-- upload. Alinha o servidor com o que a UI já promete.
update storage.buckets set file_size_limit = 10485760 where id = 'project-files'; -- 10 MB, igual ao MAX_FILE_SIZE do client
