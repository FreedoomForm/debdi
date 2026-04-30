import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePosAuth, serverError } from '@/lib/pos/auth'

/**
 * GET /api/pos/employees
 *
 * Lists employees (LOW_ADMIN / WORKER / COURIER) under the current owner.
 * Used by the POS settings page and shift-assignment dropdowns.
 */
export async function GET(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  try {
    const items = await db.admin.findMany({
      where: {
        OR: [
          { id: ctx.ownerAdminId },
          { createdBy: ctx.ownerAdminId },
        ],
        role: { in: ['MIDDLE_ADMIN', 'LOW_ADMIN', 'WORKER', 'COURIER'] },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        salary: true,
        phone: true,
        isOnShift: true,
        shiftStartedAt: true,
        averageDeliveryMinutes: true,
      },
      orderBy: [{ isActive: 'desc' }, { role: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json({ items })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
