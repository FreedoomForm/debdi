'use client'
import { SessionProvider } from 'next-auth/react'
import type { ReactNode } from 'react'

/**
 * Thin client wrapper around next-auth's SessionProvider so that any
 * client component (e.g. UnifiedShell's useSession) gets the session
 * context. Mounted in the root layout.
 */
export function SessionProviderClient({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
