import type { Metadata } from 'next'
import QrTablePage from './QrTablePage'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Меню',
  robots: { index: false, follow: false },
}

type Ctx = { params: Promise<{ token: string }> }

export default async function Page({ params }: Ctx) {
  const { token } = await params
  return <QrTablePage token={token} />
}
