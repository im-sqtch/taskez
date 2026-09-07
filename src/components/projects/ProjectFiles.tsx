import { Download, File, FileText, Image, Paperclip, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatBytes, formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { confirmAction } from '@/store/confirmStore'
import { useDataStore } from '@/store/dataStore'
import type { ProjectFile } from '@/types'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB — arquivos ficam no Supabase Storage

function iconFor(type: string) {
  if (type.startsWith('image/')) return Image
  if (type === 'application/pdf' || type.startsWith('text/')) return FileText
  return File
}

export function ProjectFiles({ projectId }: { projectId: string }) {
  const project = useDataStore((s) => s.projects.find((p) => p.id === projectId))
  const allFiles = useDataStore((s) => s.files)
  const addFile = useDataStore((s) => s.addFile)
  const removeFile = useDataStore((s) => s.removeFile)
  const currentUser = useAuthStore((s) => s.currentUser())
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const files = allFiles
    .filter((f) => f.projectId === projectId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !currentUser || !project) return

    if (file.size > MAX_FILE_SIZE) {
      setError(`"${file.name}" tem ${formatBytes(file.size)}. O limite é ${formatBytes(MAX_FILE_SIZE)} por arquivo.`)
      return
    }

    setError(null)
    setUploading(true)
    const storagePath = `${project.workspaceId}/${projectId}/${crypto.randomUUID()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('project-files').upload(storagePath, file)
    if (uploadError) {
      setError('Não foi possível enviar esse arquivo.')
      setUploading(false)
      return
    }
    addFile({
      workspaceId: project.workspaceId,
      projectId,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      storagePath,
      uploadedBy: currentUser.id,
    })
    setUploading(false)
  }

  async function handleDownload(file: ProjectFile) {
    setDownloadingId(file.id)
    const { data, error: signError } = await supabase.storage.from('project-files').createSignedUrl(file.storagePath, 60)
    setDownloadingId(null)
    if (signError || !data) {
      setError('Não foi possível baixar esse arquivo.')
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  function handleRemove(file: ProjectFile) {
    confirmAction({
      title: 'Excluir arquivo',
      description: `Excluir "${file.name}"?`,
      confirmLabel: 'Excluir',
      danger: true,
      onConfirm: () => removeFile(file.id),
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <input ref={inputRef} type="file" onChange={handleFileChange} className="hidden" />
      <Button
        variant="secondary"
        size="sm"
        icon={<Upload size={15} />}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="self-start"
      >
        {uploading ? 'Enviando...' : 'Enviar arquivo'}
      </Button>
      <p className="text-xs text-text-faint">Até {formatBytes(MAX_FILE_SIZE)} por arquivo, visível para toda a equipe do workspace.</p>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}

      {files.length === 0 ? (
        <EmptyState icon={<Paperclip size={22} />} title="Nenhum arquivo ainda" description="Envie documentos, imagens e outros arquivos deste projeto." />
      ) : (
        <div className="flex flex-col gap-2">
          {files.map((file) => {
            const Icon = iconFor(file.type)
            return (
              <div key={file.id} className="flex items-center gap-3 rounded-xl bg-surface p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-text-muted">
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{file.name}</p>
                  <p className="text-xs text-text-faint">
                    {formatBytes(file.size)} · {formatDate(file.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => handleDownload(file)}
                  disabled={downloadingId === file.id}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-text-faint hover:text-accent disabled:opacity-40"
                  aria-label={`Baixar ${file.name}`}
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={() => handleRemove(file)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-text-faint hover:text-danger"
                  aria-label={`Excluir ${file.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
