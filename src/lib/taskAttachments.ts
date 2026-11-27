import { supabase } from '@/lib/supabase'
import { useDataStore } from '@/store/dataStore'

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024 // 10 MB, igual ao limite do bucket

// Envia um arquivo para o Storage e o registra como anexo da tarefa.
// Devolve uma mensagem de erro, ou null quando deu certo.
export async function uploadTaskAttachment(file: File, target: { taskId: string; workspaceId: string; userId: string }): Promise<string | null> {
  if (file.size > MAX_ATTACHMENT_SIZE) return `"${file.name}" ultrapassa o limite de 10 MB.`
  const storagePath = `${target.workspaceId}/${target.taskId}/${crypto.randomUUID()}-${file.name}`
  const { error } = await supabase.storage.from('project-files').upload(storagePath, file)
  if (error) return `Não foi possível enviar "${file.name}".`
  useDataStore.getState().addFile({
    workspaceId: target.workspaceId,
    projectIds: [],
    taskIds: [target.taskId],
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
    storagePath,
    uploadedBy: target.userId,
  })
  return null
}
