import type { Metadata } from 'next'
import { UnifiedShell } from '@/components/layout/UnifiedShell'

export const metadata: Metadata = {
  title: 'Super Admin',
  robots: { index: false, follow: false },
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return <UnifiedShell>{children}</UnifiedShell>
}

