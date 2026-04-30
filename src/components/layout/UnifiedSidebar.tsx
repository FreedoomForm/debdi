'use client'
/**
 * Unified two-level sidebar.
 *
 * Left rail: 10 top-level sections (icon + short label).
 * Right rail: sub-items of the active section, scrollable.
 *
 * Replaces the legacy 1-level sidebar that grew to 15+ items, plus the
 * separate POS dashboard quick-grid. Used by the unified `/pos/*` and
 * eventually `/middle-admin` shells.
 */
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Menu, X, ChevronRight, Search, LogOut, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV, findActiveNav, type NavItem, type NavSection } from '@/lib/nav/structure'

const COLOR_MAP: Record<string, { active: string; idle: string; dot: string }> = {
  amber: {
    active: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    idle: 'text-muted-foreground hover:bg-accent',
    dot: 'bg-amber-500',
  },
  orange: {
    active: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
    idle: 'text-muted-foreground hover:bg-accent',
    dot: 'bg-orange-500',
  },
  rose: {
    active: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
    idle: 'text-muted-foreground hover:bg-accent',
    dot: 'bg-rose-500',
  },
  blue: {
    active: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
    idle: 'text-muted-foreground hover:bg-accent',
    dot: 'bg-blue-500',
  },
  emerald: {
    active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    idle: 'text-muted-foreground hover:bg-accent',
    dot: 'bg-emerald-500',
  },
  cyan: {
    active: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
    idle: 'text-muted-foreground hover:bg-accent',
    dot: 'bg-cyan-500',
  },
  indigo: {
    active: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
    idle: 'text-muted-foreground hover:bg-accent',
    dot: 'bg-indigo-500',
  },
  lime: {
    active: 'bg-lime-500/15 text-lime-700 dark:text-lime-300',
    idle: 'text-muted-foreground hover:bg-accent',
    dot: 'bg-lime-500',
  },
  violet: {
    active: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
    idle: 'text-muted-foreground hover:bg-accent',
    dot: 'bg-violet-500',
  },
  slate: {
    active: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
    idle: 'text-muted-foreground hover:bg-accent',
    dot: 'bg-slate-500',
  },
}

export function UnifiedSidebar({
  defaultCollapsed = false,
  userRole,
  onLogout,
}: {
  defaultCollapsed?: boolean
  userRole?: string
  onLogout?: () => void
}) {
  const pathname = usePathname() ?? '/'
  const search = useSearchParams()
  const searchStr = search?.toString() ? `?${search.toString()}` : ''
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hoverSection, setHoverSection] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const { section: activeSection, child: activeChild } = useMemo(
    () => findActiveNav(pathname, searchStr),
    [pathname, searchStr]
  )

  // The "expanded" section is whichever the user is hovering, or the active one.
  const expandedId = hoverSection ?? activeSection?.id ?? NAV[0].id
  const expanded = NAV.find((s) => s.id === expandedId) ?? NAV[0]

  // Filter children if user is searching.
  const filteredChildren: NavItem[] = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return expanded.children
    return expanded.children.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        (c.desc ?? '').toLowerCase().includes(q)
    )
  }, [expanded, query])

  // Hide items the user's role can't access.
  const visibleChildren = filteredChildren.filter(
    (c) => !c.rolesAllowed || (userRole && c.rolesAllowed.includes(userRole as any))
  )

  return (
    <>
      {/* Mobile menu button (top-right floating) */}
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Меню"
        className="fixed bottom-4 right-4 z-50 grid h-12 w-12 place-items-center rounded-full border border-border bg-card shadow-lg lg:hidden"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex h-screen border-r border-border bg-card transition-transform duration-200 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Level 1: section rail */}
        <nav
          className="flex w-[72px] shrink-0 flex-col items-center gap-1 border-r border-border bg-secondary/40 py-3"
          aria-label="Главное меню"
        >
          <Link
            href="/pos/dashboard"
            className="mb-2 grid h-10 w-10 place-items-center rounded-xl bg-foreground text-background shadow-sm"
            title="Debdi"
          >
            <ShoppingBag className="h-5 w-5" />
          </Link>
          {NAV.map((s) => {
            const isActive = activeSection?.id === s.id
            const isHover = hoverSection === s.id
            const Icon = s.icon
            const colors = COLOR_MAP[s.color] ?? COLOR_MAP.slate
            return (
              <Link
                key={s.id}
                href={s.href}
                onMouseEnter={() => setHoverSection(s.id)}
                onMouseLeave={() => setHoverSection(null)}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'group relative grid h-12 w-12 place-items-center rounded-xl transition',
                  isActive
                    ? colors.active
                    : isHover
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-accent'
                )}
                title={s.label}
              >
                {isActive && (
                  <span className="absolute -left-3 top-2 bottom-2 w-1 rounded-r-full bg-current" />
                )}
                <Icon className="h-5 w-5" />
                {/* Tooltip-like label on hover */}
                <span className="absolute left-full ml-2 hidden whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium shadow-md group-hover:block">
                  {s.label}
                </span>
              </Link>
            )
          })}
          <div className="mt-auto" />
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="grid h-10 w-10 place-items-center rounded-xl text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
              title="Выйти"
              aria-label="Выйти"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </nav>

        {/* Level 2: section detail rail */}
        <div className="flex w-[240px] flex-col">
          <header className="border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'h-2.5 w-2.5 rounded-full',
                  COLOR_MAP[expanded.color]?.dot ?? 'bg-slate-400'
                )}
              />
              <h2 className="text-sm font-semibold tracking-tight">
                {expanded.label}
              </h2>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {expanded.desc}
            </p>
            <div className="relative mt-2.5">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Найти раздел…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8 w-full rounded-md border border-border bg-background pl-7 pr-2 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </header>
          <div className="flex-1 overflow-y-auto px-2 py-2">
            <ul className="space-y-0.5">
              {visibleChildren.map((c) => {
                const isActive = activeChild?.id === c.id
                const Icon = c.icon
                const colors = COLOR_MAP[expanded.color] ?? COLOR_MAP.slate
                return (
                  <li key={c.id}>
                    <Link
                      href={c.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition',
                        isActive
                          ? `${colors.active} font-medium`
                          : 'text-foreground/80 hover:bg-accent'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0',
                          isActive ? '' : 'text-muted-foreground'
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm leading-tight">
                          {c.label}
                        </div>
                        {c.desc && (
                          <div className="truncate text-[10px] text-muted-foreground">
                            {c.desc}
                          </div>
                        )}
                      </div>
                      {c.badge === 'live' && (
                        <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                          live
                        </span>
                      )}
                      {c.badge === 'new' && (
                        <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                          new
                        </span>
                      )}
                      {isActive && <ChevronRight className="h-3 w-3" />}
                    </Link>
                  </li>
                )
              })}
              {visibleChildren.length === 0 && (
                <li className="px-2 py-6 text-center text-xs text-muted-foreground">
                  Ничего не найдено
                </li>
              )}
            </ul>
          </div>
          {/* Footer: hint */}
          <footer className="border-t border-border bg-secondary/30 px-3 py-2 text-[10px] text-muted-foreground">
            <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono">
              /
            </kbd>{' '}
            — поиск,{' '}
            <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono">
              Esc
            </kbd>{' '}
            — закрыть
          </footer>
        </div>
      </aside>
    </>
  )
}
