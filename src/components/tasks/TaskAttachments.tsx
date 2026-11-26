import { Download, File, FileText, Image, Paperclip, Plus, Unlink, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { formatBytes, formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useDataStore } from '@/store/dataStore'

const MAX_FILE_SIZE = 10 * 1024 * 1024

function iconFor(type: string) {
  if (type.startsWith('image/')) return Image
  if (type === 'application/pdf' || type.startsWith('text/')) return FileText
  return File
}

export function TaskAttachments({ taskId }: { taskId: string }) {
  const task = useDataStore((s) => s.tasks.find((item) => item.id === taskId))
  const allFiles = useDataStore((s) => s.files)
  const addFile = useDataStore((s) => s.addFile)
  const linkFileToTask = useDataStore((s) => s.linkFileToTask)
  const unlinkFileFromTask = useDataStore((s) => s.unlinkFileFromTask)
  const user = useAuthStore((s) => s.currentUser())
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [showAvailable, setShowAvailable] = useState(false)
  if (!task) return null
  const activeTask = task

  const attachments = allFiles.filter((file) => (file.taskIds ?? []).includes(taskId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const available = allFiles.filter((file) => file.workspaceId === activeTask.workspaceId && !(file.taskIds ?? []).includes(taskId) && !file.deletedAt)

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!user || selected.length === 0) return
    const oversized = selected.find((file) => file.size > MAX_FILE_SIZE)
    if (oversized) {
      setError(`"${oversized.name}" ultrapassa o limite de ${formatBytes(MAX_FILE_SIZE)}.`)
      return
    }
    setError(null)
    setUploading(true)
    for (const file of selected) {
      const fileId = crypto.randomUUID()
      const storagePath = `${activeTask.workspaceId}/${taskId}/${fileId}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('project-files').upload(storagePath, file)
      if (uploadError) {
        setError(`Não foi possível enviar "${file.name}".`)
        continue
      }
      addFile({
        workspaceId: activeTask.workspaceId,
        projectIds: [],
        taskIds: [taskId],
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        storagePath,
        uploadedBy: user.id,
      })
    }
    setUploading(false)
  }

  async function download(file: (typeof attachments)[number]) {
    setDownloadingId(file.id)
    const { data, error: signError } = await supabase.storage.from('project-files').createSignedUrl(file.storagePath, 60)
    setDownloadingId(null)
    if (signError || !data) {
      setError(`Não foi possível abrir "${file.name}".`)
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="flex flex-col gap-3 px-5">
      <input ref={inputRef} type="file" multiple onChange={handleFiles} className="hidden" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-bold text-text"><Paperclip size={16} /> Anexos {attachments.length > 0 && `(${attachments.length})`}</p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Upload size={14} />} onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? 'Enviando…' : 'Enviar arquivo'}
          </Button>
          {available.length > 0 && <Button variant="ghost" size="sm" icon={<Plus size={14} />} onClick={() => setShowAvailable((value) => !value)}>Vincular existente</Button>}
        </div>
      </div>
      {error && <p role="alert" className="text-xs font-medium text-danger">{error}</p>}
      {showAvailable && available.length > 0 && (
        <div className="flex flex-col gap-1 rounded-xl bg-surface p-2">
          {available.map((file) => <button key={file.id} onClick={() => { linkFileToTask(file.id, taskId); setShowAvailable(false) }} className="rounded-lg px-3 py-2 text-left text-sm text-text hover:bg-surface-alt">{file.name}</button>)}
        </div>
      )}
      {attachments.length > 0 && <div className="flex flex-col gap-2">
        {attachments.map((file) => {
          const Icon = iconFor(file.type)
          return <div key={file.id} className="flex items-center gap-3 rounded-xl bg-surface p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-text-muted"><Icon size={17} /></div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-text">{file.name}</p><p className="text-xs text-text-faint">{formatBytes(file.size)} · {formatDate(file.createdAt)}</p></div>
            <button onClick={() => void download(file)} disabled={downloadingId === file.id} aria-label={`Abrir ${file.name}`} className="flex h-9 w-9 items-center justify-center rounded-full text-text-faint hover:text-accent"><Download size={16} /></button>
            <button onClick={() => unlinkFileFromTask(file.id, taskId)} aria-label={`Desvincular ${file.name} da tarefa`} className="flex h-9 w-9 items-center justify-center rounded-full text-text-faint hover:text-danger"><Unlink size={16} /></button>
          </div>
        })}
      </div>}
    </section>
  )
}
