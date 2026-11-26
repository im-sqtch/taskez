import { Download, Paperclip, Search, Unlink, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { FilePreviewDialog } from '@/components/files/FilePreviewDialog'
import { FileThumbnail } from '@/components/files/FileThumbnail'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { FindFileSheet } from '@/components/projects/FindFileSheet'
import { getFileDownloadUrl } from '@/lib/fileUrls'
import { formatBytes, formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { confirmAction } from '@/store/confirmStore'
import { useDataStore } from '@/store/dataStore'
import type { ProjectFile } from '@/types'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB — arquivos ficam no Supabase Storage

export function ProjectFiles({ projectId }: { projectId: string }) {
  const project = useDataStore((s) => s.projects.find((p) => p.id === projectId))
  const allFiles = useDataStore((s) => s.files)
  const addFile = useDataStore((s) => s.addFile)
  const unlinkFileFromProject = useDataStore((s) => s.unlinkFileFromProject)
  const currentUser = useAuthStore((s) => s.currentUser())
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [findOpen, setFindOpen] = useState(false)

  const files = allFiles
    .filter((f) => f.projectIds.includes(projectId))
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
      projectIds: [projectId],
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
    const url = await getFileDownloadUrl(file)
    setDownloadingId(null)
    if (!url) {
      setError('Não foi possível baixar esse arquivo.')
      return
    }
    window.location.assign(url)
  }

  function handleUnlink(file: ProjectFile) {
    confirmAction({
      title: 'Remover arquivo do projeto',
      description: `Remover "${file.name}" deste projeto? O arquivo continua disponível na tela geral de Arquivos.`,
      confirmLabel: 'Remover',
      danger: true,
      onConfirm: () => unlinkFileFromProject(file.id, projectId),
    })
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <input ref={inputRef} type="file" onChange={handleFileChange} className="hidden" />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={<Upload size={15} />}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Enviando...' : 'Enviar arquivo'}
        </Button>
        <Button variant="secondary" size="sm" icon={<Search size={15} />} onClick={() => setFindOpen(true)}>
          Encontrar arquivo
        </Button>
      </div>
      <p className="text-xs text-text-faint">Até {formatBytes(MAX_FILE_SIZE)} por arquivo, visível para toda a equipe do workspace.</p>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}

      {files.length === 0 ? (
        <EmptyState icon={<Paperclip size={22} />} title="Nenhum arquivo ainda" description="Envie documentos, imagens e outros arquivos deste projeto." />
      ) : (
        <div className="flex flex-col gap-2">
          {files.map((file, index) => {
            return (
              <div key={file.id} className="flex items-center gap-3 rounded-xl bg-surface p-3">
                <button type="button" onClick={() => setPreviewIndex(index)} aria-label={`Visualizar ${file.name}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-accent">
                  <FileThumbnail file={file} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text hover:text-accent">{file.name}</p>
                    <p className="text-xs text-text-faint">
                      {formatBytes(file.size)} · {formatDate(file.createdAt)}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => handleDownload(file)}
                  disabled={downloadingId === file.id}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-text-faint hover:text-accent disabled:opacity-40"
                  aria-label={`Baixar ${file.name}`}
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={() => handleUnlink(file)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-text-faint hover:text-danger"
                  aria-label={`Remover ${file.name} deste projeto`}
                >
                  <Unlink size={16} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <FilePreviewDialog files={files} index={previewIndex} onIndexChange={setPreviewIndex} />
      <FindFileSheet open={findOpen} onClose={() => setFindOpen(false)} projectId={projectId} excludeFileIds={files.map((f) => f.id)} />
    </div>
  )
}
