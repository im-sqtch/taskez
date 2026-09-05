import { cn, initials } from '@/lib/utils'

interface AvatarProps {
  name: string
  color: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  ring?: boolean
  className?: string
}

const sizes = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-16 h-16 text-lg',
}

export function Avatar({ name, color, size = 'md', ring, className }: AvatarProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-bold text-white shrink-0',
        sizes[size],
        ring && 'ring-2 ring-base',
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {initials(name)}
    </div>
  )
}
