import { useState } from 'react'
import { cn, initials } from '@/lib/utils'

interface AvatarProps {
  name: string
  color: string
  // Foto de perfil; se faltar ou não carregar, mostra as iniciais na cor.
  src?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  ring?: boolean
  className?: string
}

const sizes = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-2xl',
}

export function Avatar({ name, color, src, size = 'md', ring, className }: AvatarProps) {
  const [failed, setFailed] = useState<string | null>(null)
  const showPhoto = Boolean(src) && failed !== src
  return (
    <div
      className={cn(
        'flex items-center justify-center overflow-hidden rounded-full font-bold text-white shrink-0',
        sizes[size],
        ring && 'ring-2 ring-base',
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {showPhoto ? <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(src!)} /> : initials(name)}
    </div>
  )
}
