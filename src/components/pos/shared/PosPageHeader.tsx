'use client'
/**
 * PosPageHeader — shared 48px sticky page header used across every new
 * POS page. Replaces 20+ near-identical inline headers, each shaped like:
 *
 *   <header className="flex h-12 items-center justify-between border-b
 *                      border-border bg-card px-3">
 *     <div className="flex items-center gap-2">
 *       <Button asChild variant="ghost" size="icon" className="h-8 w-8">
 *         <Link href={backHref}>...</Link>
 *       </Button>
 *       <Icon /> <h1 /> <Badge />
 *     </div>
 *     <div className="flex items-center gap-2">
 *       {actions}
 *     </div>
 *   </header>
 *
 * Single source of truth → one place to tweak height/spacing/border later.
 */
import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface PosPageHeaderProps {
  /** Title shown in the header. */
  title: string
  /** Lucide icon component class — rendered next to the title. */
  icon?: ReactNode
  /** Optional badge (e.g. result count, "live", "new"). */
  badge?: ReactNode
  /** Where the back-arrow points. Defaults to /pos/dashboard. */
  backHref?: string
  /** Right-aligned actions (Refresh / Add / etc). */
  actions?: ReactNode
  /** Optional additional classes for the <header>. */
  className?: string
}

export function PosPageHeader({
  title,
  icon,
  badge,
  backHref = '/pos/dashboard',
  actions,
  className,
}: PosPageHeaderProps) {
  return (
    <header
      className={cn(
        'flex h-12 items-center justify-between border-b border-border bg-card px-3',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href={backHref} aria-label="Назад">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        {icon}
        <h1 className="text-sm font-semibold">{title}</h1>
        {badge != null &&
          (typeof badge === 'string' || typeof badge === 'number' ? (
            <Badge variant="secondary" className="text-[10px]">
              {badge}
            </Badge>
          ) : (
            badge
          ))}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}

export default PosPageHeader
