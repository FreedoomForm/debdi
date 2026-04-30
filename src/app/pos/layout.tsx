import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { UnifiedShell } from '@/components/layout/UnifiedShell'

export default function PosLayout({ children }: { children: ReactNode }) {
  return (
    <UnifiedShell>
      <Suspense fallback={null}>{children}</Suspense>
    </UnifiedShell>
  )
}
