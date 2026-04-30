import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePosAuth, badRequest, serverError } from '@/lib/pos/auth'

const createSchema = z.object({
  shiftId: z.string(),
  type: z.enum(['PAID_IN', 'PAID_OUT', 'DROP', 'CHANGE_FUND', 'ADJUSTMENT']),
  amount: z.number(),
  reason: z.string().nullable().optional(),
})

export async function GET(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { searchParams } = new URL(request.url)
  const shiftId = searchParams.get('shiftId')
  if (!shiftId) return badRequest('shiftId_required')
  try {
    const items = await db.cashDrawerMovement.findMany({
      where: { shiftId },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ items })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const json = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(json)
  if (!parsed.success) return badRequest(parsed.error.message)

  // Sign the amount based on type for consistency.
  const signedAmount =
    parsed.data.type === 'PAID_OUT' || parsed.data.type === 'DROP'
      ? -Math.abs(parsed.data.amount)
      : Math.abs(parsed.data.amount)

  try {
    const created = await db.cashDrawerMovement.create({
      data: {
        shiftId: parsed.data.shiftId,
        type: parsed.data.type,
        amount: signedAmount,
        reason: parsed.data.reason ?? null,
        performedBy: ctx.user.id,
      },
    })
    return NextResponse.json({ item: created }, { status: 201 })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
