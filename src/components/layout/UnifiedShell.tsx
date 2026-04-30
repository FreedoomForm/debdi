'use client'
/**
 * UnifiedShell — top-level chrome that wraps every page in the
 * (unified) route group with the new two-level sidebar, command palette,
 * and a skinny top bar.
 *
 * Pages that need the full screen (POS terminal, KDS, customer display,
 * floor plan) are listed in `FULLSCREEN_PATHS` and bypass the sidebar.
 */
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { UnifiedSidebar } from './UnifiedSidebar'
import { CommandPalette } from './CommandPalette'

const FULLSCREEN_PATHS = [
  '/pos/terminal',
  '/pos/kds',
  '/pos/customer-display',
  '/pos/tables',
]

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
      <UnifiedSidebar
        userRole={(session?.user as any)?.role}
        onLogout={() => signOut({ callbackUrl: '/login' })}
      />
      <main className="ml-0 min-w-0 flex-1 lg:ml-[312px]">{children}</main>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}
