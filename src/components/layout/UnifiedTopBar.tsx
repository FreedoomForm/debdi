'use client'
/**
 * Top bar that lives at the top of every page wrapped by UnifiedShell.
 *
 * Renders:
 *   • current section + page breadcrumbs (derived from the URL via NAV)
 *   • search hint that opens the command palette
 *   • notifications bell
 *   • theme toggle
 *   • avatar + sign-out
 *
 * Stays out of the way (40px tall) so the page content gets the screen.
 */
import { useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Search, Sun, Moon, Monitor as ScreenIcon, ChevronRight } from 'lucide-react'
import { useTheme } from 'next-themes'
import { findActiveNav } from '@/lib/nav/structure'
import { NotificationsBell } from './NotificationsBell'
import { cn } from '@/lib/utils'

export function UnifiedTopBar({
  onOpenPalette,
  userEmail,
}: {
  onOpenPalette: () => void
  userEmail?: string | null
}) {
  const pathname = usePathname() ?? '/'
  const search = useSearchParams()
  const searchStr = search?.toString() ? `?${search.toString()}` : ''
  const { resolvedTheme, setTheme } = useTheme()

  const { section, child } = useMemo(
    () => findActiveNav(pathname, searchStr),
    [pathname, searchStr]
  )

  const cycleTheme = () => {
    const order = ['light', 'dark', 'system'] as const
    const cur = (resolvedTheme as any) ?? 'light'
    const next = order[(order.indexOf(cur as any) + 1) % order.length]
    setTheme(next)
  }

  const ThemeIcon =
    resolvedTheme === 'dark' ? Moon : resolvedTheme === 'system' ? ScreenIcon : Sun

  return (
    <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      {/* Breadcrumbs */}
      <nav className="flex min-w-0 items-center gap-1.5 text-sm">
        <Link
          href="/pos/dashboard"
          className="text-muted-foreground hover:text-foreground"
        >
          Debdi
        </Link>
        {section && (
          <>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <Link
              href={section.href}
              className={cn(
                'truncate font-medium',
                child ? 'text-muted-foreground hover:text-foreground' : ''
              )}
            >
              {section.label}
            </Link>
          </>
        )}
        {child && (
          <>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <span className="truncate font-medium text-foreground">
              {child.label}
            </span>
          </>
        )}
      </nav>

      {/* Right cluster */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onOpenPalette}
          className="hidden items-center gap-2 rounded-md border border-border bg-background/60 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent sm:inline-flex"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Поиск…</span>
          <kbd className="ml-2 rounded border border-border bg-card px-1 py-0.5 font-mono text-[10px]">
            ⌘K
          </kbd>
        </button>
        <NotificationsBell />
        <button
          type="button"
          onClick={cycleTheme}
          className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Сменить тему"
          title="Сменить тему"
        >
          <ThemeIcon className="h-4 w-4" />
        </button>
        {userEmail && (
          <div
            className="hidden h-9 items-center gap-2 rounded-md border border-border bg-background px-2 text-xs sm:flex"
            title={userEmail}
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
              {userEmail[0]?.toUpperCase()}
            </span>
            <span className="max-w-[140px] truncate font-medium">
              {userEmail}
            </span>
          </div>
        )}
      </div>
    </header>
  )
}
