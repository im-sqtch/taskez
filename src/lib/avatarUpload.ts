import { supabase } from '@/lib/supabase'

const BUCKET = 'avatars'
const SIZE = 256

// Recorta o centro da imagem em quadrado e reduz para 256×256 JPEG (~20–40 KB):
// a foto carrega rápido em qualquer lista e não pesa no armazenamento.
async function squareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('Não foi possível ler essa imagem. Tente outra (JPG ou PNG).')
  })
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  canvas.getContext('2d')!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE)
  bitmap.close()
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar a imagem'))), 'image/jpeg', 0.85))
}

function pathFromUrl(url: string | undefined): string | null {
  const marker = `/object/public/${BUCKET}/`
  const index = url?.indexOf(marker) ?? -1
  return url && index >= 0 ? url.slice(index + marker.length) : null
}

// Envia a nova foto (cada envio ganha um nome novo, então nenhum cache mostra a
// antiga) e apaga a anterior. Devolve a URL pública.
export async function uploadAvatar(userId: string, file: File, previousUrl?: string): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.')
  const blob = await squareJpeg(file)
  const path = `${userId}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw new Error('Não foi possível enviar a foto.')
  await removeAvatar(previousUrl)
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export async function removeAvatar(url: string | undefined) {
  const path = pathFromUrl(url)
  if (path) await supabase.storage.from(BUCKET).remove([path])
}
