import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePosAuth, serverError } from '@/lib/pos/auth'

/**
 * GET /api/pos/customers/search?q=...
 *
 * Lightweight customer lookup used by the POS terminal's customer picker.
 * Returns up to 25 matches by name OR phone, scoped to the current owner.
 */
export async function GET(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim()
  try {
    const items = await db.customer.findMany({
      where: {
        createdBy: ctx.ownerAdminId,
        deletedAt: null,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' as const } },
                { phone: { contains: q } },
                { nickName: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        nickName: true,
        phone: true,
        balance: true,
        totalSpent: true,
        totalOrders: true,
        lastOrderAt: true,
        loyaltyMember: {
          select: { points: true, tier: true, lifetimeSpent: true },
        },
      },
      orderBy: [{ lastOrderAt: 'desc' }, { name: 'asc' }],
      take: 25,
    })
    return NextResponse.json({ items })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
