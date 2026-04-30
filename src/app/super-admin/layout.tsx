import type { Metadata } from 'next'
import { Suspense } from 'react'
import { UnifiedShell } from '@/components/layout/UnifiedShell'

export const metadata: Metadata = {
  title: 'Super Admin',
  robots: { index: false, follow: false },
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <UnifiedShell>
      <Suspense fallback={null}>{children}</Suspense>
    </UnifiedShell>
  )
}
