'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type StatusTone = 'neutral' | 'success' | 'warning' | 'danger'

const toneClassMap: Record<StatusTone, string> = {
  neutral: 'border-border bg-background text-foreground',
  success: 'border-border bg-background text-foreground',
  warning: 'border-border bg-background text-foreground',
  danger: 'border-border bg-background text-foreground',
}

export function EntityStatusBadge({
  isActive,
  activeLabel,
  inactiveLabel,
  activeTone = 'success',
  inactiveTone = 'warning',
  showDot = false,
  className,
  onClick,
}: {
  isActive: boolean
  activeLabel: string
  inactiveLabel: string
  activeTone?: StatusTone
  inactiveTone?: StatusTone
  showDot?: boolean
  className?: string
  onClick?: () => void
}) {
  const toneClass = toneClassMap[isActive ? activeTone : inactiveTone]

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1',
        toneClass,
        onClick && 'cursor-pointer transition-opacity hover:opacity-85',
        className
      )}
      onClick={onClick}
    >
      {showDot && <span className={cn('size-2 rounded-full', isActive ? 'bg-emerald-500' : 'bg-amber-500')} />}
      {isActive ? activeLabel : inactiveLabel}
    </Badge>
  )
}
