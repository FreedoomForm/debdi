'use client'
/**
 * RefreshButton — shared "Reload data" button used across every new POS page.
 *
 * Replaces ~17 near-identical inline blocks of:
 *
 *   <Button variant="outline" size="sm" onClick={load} disabled={loading}>
 *     {loading ? (
 *       <Loader2 className="mr-1 h-4 w-4 animate-spin" />
 *     ) : (
 *       <RefreshCw className="mr-1 h-4 w-4" />
 *     )}
 *     Обновить
 *   </Button>
 *
 * Single source of truth → one place to tweak label/icon/spacing later.
 */
import type { MouseEventHandler, ReactNode } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface RefreshButtonProps {
  /** Click handler — typically the page's `load()` / `refresh()`. */
  onClick: MouseEventHandler<HTMLButtonElement>
  /** Disables the button and shows the spinner instead of the static icon. */
  loading?: boolean
  /** Visible label. Defaults to "Обновить". Pass null for icon-only mode. */
  label?: ReactNode | null
  /** "outline" (default) or "ghost" / "default" / "secondary". */
  variant?: 'outline' | 'ghost' | 'default' | 'secondary'
  /** Standard `Button` size. Defaults to `sm`. */
  size?: 'sm' | 'icon' | 'default' | 'lg'
  className?: string
  /** Optional aria-label for icon-only mode. */
  ariaLabel?: string
}

export function RefreshButton({
  onClick,
  loading = false,
  label = 'Обновить',
  variant = 'outline',
  size = 'sm',
  className,
  ariaLabel,
}: RefreshButtonProps) {
  const iconOnly = label === null || size === 'icon'
  const Icon = loading ? Loader2 : RefreshCw
  const iconClassName = cn(
    'h-4 w-4',
    !iconOnly && 'mr-1',
    loading && 'animate-spin'
  )
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={loading}
      aria-label={ariaLabel ?? (iconOnly ? 'Обновить' : undefined)}
      className={className}
    >
      <Icon className={iconClassName} />
      {!iconOnly && label}
    </Button>
  )
}

export default RefreshButton
