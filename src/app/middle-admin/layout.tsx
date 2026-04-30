import type { ReactNode } from 'react'
import { UnifiedShell } from '@/components/layout/UnifiedShell'

/**
 * Middle-admin layout — wraps the legacy AdminDashboardPage in the new
 * UnifiedShell so the 10-section sidebar + top bar are present everywhere.
 * The inner page keeps its own internal tabs but they are now hierarchical
 * children of the "Operations" / "Sales" / "Finance" top-level sections via
 * deep links in src/lib/nav/structure.ts.
 */
export default function MiddleAdminLayout({ children }: { children: ReactNode }) {
  return <UnifiedShell>{children}</UnifiedShell>
}
