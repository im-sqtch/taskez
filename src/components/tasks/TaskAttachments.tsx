import { Download, Paperclip, Plus, Unlink, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { FilePreviewDialog } from '@/components/files/FilePreviewDialog'
import { FileThumbnail } from '@/components/files/FileThumbnail'
import { Button } from '@/components/ui/Button'
import { getFileDownloadUrl } from '@/lib/fileUrls'
import { MAX_ATTACHMENT_SIZE, uploadTaskAttachment } from '@/lib/taskAttachments'
import { cn, formatBytes, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useDataStore } from '@/store/dataStore'

export function TaskAttachments({ taskId, inset = true }: { taskId: string; inset?: boolean }) {
  const task = useDataStore((s) => s.tasks.find((item) => item.id === taskId))
  const allFiles = useDataStore((s) => s.files)
  const linkFileToTask = useDataStore((s) => s.linkFileToTask)
  const unlinkFileFromTask = useDataStore((s) => s.unlinkFileFromTask)
  const user = useAuthStore((s) => s.currentUser())
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [showAvailable, setShowAvailable] = useState(false)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  if (!task) return null
  const activeTask = task

  const attachments = allFiles.filter((file) => (file.taskIds ?? []).includes(taskId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const available = allFiles.filter((file) => file.workspaceId === activeTask.workspaceId && !(file.taskIds ?? []).includes(taskId) && !file.deletedAt)

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!user || selected.length === 0) return
    setError(null)
    setUploading(true)
    for (const file of selected) {
      const failure = await uploadTaskAttachment(file, { taskId, workspaceId: activeTask.workspaceId, userId: user.id })
      if (failure) setError(failure)
    }
    setUploading(false)
  }

  async function download(file: (typeof attachments)[number]) {
    setDownloadingId(file.id)
    const url = await getFileDownloadUrl(file)
    setDownloadingId(null)
    if (!url) {
      setError(`Não foi possível baixar "${file.name}".`)
      return
    }
    window.location.assign(url)
  }

  return (
    <section className={cn('flex flex-col gap-3', inset && 'px-5')}>
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
        {attachments.map((file, index) => {
          return <div key={file.id} className="flex items-center gap-3 rounded-xl bg-surface p-3">
            <button type="button" onClick={() => setPreviewIndex(index)} aria-label={`Visualizar ${file.name}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-accent">
              <FileThumbnail file={file} />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-text hover:text-accent">{file.name}</p><p className="text-xs text-text-faint">{formatBytes(file.size)} · {formatDate(file.createdAt)}</p></div>
            </button>
            <button onClick={() => void download(file)} disabled={downloadingId === file.id} aria-label={`Baixar ${file.name}`} title="Baixar" className="flex h-9 w-9 items-center justify-center rounded-full text-text-faint hover:text-accent"><Download size={16} /></button>
            <button onClick={() => unlinkFileFromTask(file.id, taskId)} aria-label={`Desvincular ${file.name} da tarefa`} className="flex h-9 w-9 items-center justify-center rounded-full text-text-faint hover:text-danger"><Unlink size={16} /></button>
          </div>
        })}
      </div>}
      <FilePreviewDialog files={attachments} index={previewIndex} onIndexChange={setPreviewIndex} />
    </section>
  )
}

// Anexos escolhidos antes de a tarefa existir (formulário de criação): ficam
// aqui e são enviados logo depois que a tarefa é criada.
export function PendingAttachments({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  return (
    <section className="flex flex-col gap-3">
      <input ref={inputRef} type="file" multiple className="hidden" onChange={(event) => {
        const selected = Array.from(event.target.files ?? [])
        event.target.value = ''
        const oversized = selected.find((file) => file.size > MAX_ATTACHMENT_SIZE)
        setError(oversized ? `"${oversized.name}" ultrapassa o limite de ${formatBytes(MAX_ATTACHMENT_SIZE)}.` : null)
        onChange([...files, ...selected.filter((file) => file.size <= MAX_ATTACHMENT_SIZE)])
      }} />
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium text-text-muted"><Paperclip size={16} /> Anexos {files.length > 0 && `(${files.length})`}</p>
        <Button variant="secondary" size="sm" icon={<Upload size={14} />} onClick={() => inputRef.current?.click()}>Adicionar arquivo</Button>
      </div>
      {error && <p role="alert" className="text-xs font-medium text-danger">{error}</p>}
      {files.map((file, index) => (
        <div key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-xl bg-surface p-3">
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-text">{file.name}</p><p className="text-xs text-text-faint">{formatBytes(file.size)} · enviado ao criar a tarefa</p></div>
          <button type="button" onClick={() => onChange(files.filter((_, i) => i !== index))} aria-label={`Remover ${file.name}`} className="flex h-9 w-9 items-center justify-center rounded-full text-text-faint hover:text-danger"><X size={16} /></button>
        </div>
      ))}
    </section>
  )
}
