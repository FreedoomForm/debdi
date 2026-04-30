'use client'
/**
 * UnifiedShell — top-level chrome that wraps every page in the
 * (unified) route group with the new two-level sidebar, command palette,
 * and a skinny top bar.
 *
 * Pages that need the full screen (POS terminal, KDS, customer display,
 * floor plan) are listed in `FULLSCREEN_PATHS` and bypass the sidebar.
 *
 * NOTE: UnifiedSidebar and UnifiedTopBar both call useSearchParams(),
 * which forces a CSR bailout for any page that uses this shell. To keep
 * Next.js 15 happy during static prerender we wrap them in <Suspense>
 * boundaries so the rest of the page can still be rendered ahead of time.
 */
import { Suspense, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { UnifiedSidebar } from './UnifiedSidebar'
import { UnifiedTopBar } from './UnifiedTopBar'
import { CommandPalette } from './CommandPalette'

const FULLSCREEN_PATHS = [
  '/pos/terminal',
  '/pos/kds',
  '/pos/customer-display',
  '/pos/tables',
]

function SidebarFallback() {
  return (
    <aside
      aria-hidden
      className="hidden lg:flex fixed left-0 top-0 z-30 h-screen w-[312px] flex-col border-r border-border bg-card"
    />
  )
}

function TopBarFallback() {
  return (
    <div className="sticky top-0 z-20 flex h-12 items-center border-b border-border bg-background/80 backdrop-blur" />
  )
}

export function UnifiedShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname() ?? ''
  const [paletteOpen, setPaletteOpen] = useState(false)

  const fullscreen = FULLSCREEN_PATHS.some((p) => pathname.startsWith(p))

  // Cmd/Ctrl+K opens the command palette.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (fullscreen) {
    return (
      <>
        {children}
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      </>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Suspense fallback={<SidebarFallback />}>
        <UnifiedSidebar
          userRole={(session?.user as { role?: string } | undefined)?.role}
          onLogout={() => signOut({ callbackUrl: '/login' })}
        />
      </Suspense>
      <div className="ml-0 flex min-w-0 flex-1 flex-col lg:ml-[312px]">
        <Suspense fallback={<TopBarFallback />}>
          <UnifiedTopBar
            onOpenPalette={() => setPaletteOpen(true)}
            userEmail={(session?.user as { email?: string } | undefined)?.email ?? null}
          />
        </Suspense>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}
