import type { ReactNode } from 'react'
import { UnifiedShell } from '@/components/layout/UnifiedShell'

export default function PosLayout({ children }: { children: ReactNode }) {
  return <UnifiedShell>{children}</UnifiedShell>
}
