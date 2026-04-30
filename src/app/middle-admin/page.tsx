import type { Metadata } from 'next'
import AdminDashboardPage from '@/components/admin/AdminDashboardPage'

export const metadata: Metadata = {
  title: 'Middle Admin',
  robots: { index: false, follow: false },
}

// Always render this page on demand. Middle-admin always needs session +
// search-params (?tab=…), so static prerender provides no value and risks
// re-introducing useSearchParams CSR-bailout build errors when we wire
// new deep-link entries into the unified nav.
export const dynamic = 'force-dynamic'

export default function MiddleAdminPage() {
  return <AdminDashboardPage mode="middle" />
}
