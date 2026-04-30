import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  requirePosAuth,
  badRequest,
  notFound,
  serverError,
} from '@/lib/pos/auth'

/**
 * POST /api/pos/tip-pool/:id/distribute
 *
 * Marks a tip pool as DISTRIBUTED and (optionally) flips paidOut=true on
 * the listed shares. Once distributed the pool can no longer be edited;
 * the manager must create a new pool to redo the math.
 *
 * Body:
 *   { paidOutShareIds: string[] }   // empty array = mark all as paid
 */
const bodySchema = z.object({
  paidOutShareIds: z.array(z.string()).optional(),
})

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Ctx) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { id } = await params

  const pool = await db.tipPool.findFirst({
    where: { id, ownerAdminId: ctx.ownerAdminId },
    include: { shares: true },
  })
  if (!pool) return notFound('Tip pool not found')
  if (pool.status === 'DISTRIBUTED') {
    return badRequest('Pool is already distributed')
  }

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json ?? {})
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid payload')
  }
  const ids = parsed.data.paidOutShareIds ?? []

  try {
    const targetIds = ids.length > 0 ? ids : pool.shares.map((s) => s.id)
    const now = new Date()
    await db.$transaction([
      db.tipPoolShare.updateMany({
        where: { poolId: pool.id, id: { in: targetIds } },
        data: { paidOut: true, paidOutAt: now },
      }),
      db.tipPool.update({
        where: { id: pool.id },
        data: { status: 'DISTRIBUTED', closedAt: now },
      }),
    ])
    const fresh = await db.tipPool.findUnique({
      where: { id: pool.id },
      include: { shares: true },
    })
    return NextResponse.json({ pool: fresh })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
