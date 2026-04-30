import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePosAuth, badRequest, serverError } from '@/lib/pos/auth'

const openSchema = z.object({
  openingFloat: z.number().nonnegative().default(0),
  registerId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

const closeSchema = z.object({
  shiftId: z.string(),
  closingCash: z.number().nonnegative(),
  notes: z.string().nullable().optional(),
})

export async function GET(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const cashierId = searchParams.get('cashierId') ?? ctx.user.id
  try {
    const items = await db.cashierShift.findMany({
      where: {
        cashierId,
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { openedAt: 'desc' },
      take: 50,
    })
    const open = items.find((s) => s.status === 'OPEN') ?? null
    return NextResponse.json({ items, open })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const json = await request.json().catch(() => null)
  const parsed = openSchema.safeParse(json)
  if (!parsed.success) return badRequest(parsed.error.message)
  // Refuse if there's an existing OPEN shift for this cashier.
  const existing = await db.cashierShift.findFirst({
    where: { cashierId: ctx.user.id, status: 'OPEN' },
  })
  if (existing) {
    return NextResponse.json({ item: existing }, { status: 200 })
  }
  try {
    const created = await db.cashierShift.create({
      data: {
        cashierId: ctx.user.id,
        openingFloat: parsed.data.openingFloat,
        registerId: parsed.data.registerId ?? null,
        notes: parsed.data.notes ?? null,
      },
    })
    await db.notification.create({
      data: {
        recipientId: ctx.ownerAdminId,
        type: 'SHIFT_OPENED',
        title: 'Открыта смена',
        body: `${ctx.user.email} открыл смену`,
        data: { shiftId: created.id, cashierId: ctx.user.id },
      },
    })
    return NextResponse.json({ item: created }, { status: 201 })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}

export async function PATCH(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const json = await request.json().catch(() => null)
  const parsed = closeSchema.safeParse(json)
  if (!parsed.success) return badRequest(parsed.error.message)
  try {
    const shift = await db.cashierShift.findUnique({
      where: { id: parsed.data.shiftId },
    })
    if (!shift) return badRequest('shift_not_found')
    if (shift.status !== 'OPEN') return badRequest('shift_not_open')
    if (shift.cashierId !== ctx.user.id && ctx.user.role === 'COURIER') {
      return badRequest('not_your_shift')
    }
    // Sum cash payments since shift opened.
    const cashPayments = await db.payment.aggregate({
      where: {
        shiftId: shift.id,
        method: 'CASH',
        status: 'COMPLETED',
      },
      _sum: { amount: true, changeGiven: true },
    })
    const cashIn = (cashPayments._sum.amount ?? 0) - (cashPayments._sum.changeGiven ?? 0)
    const expectedCash = shift.openingFloat + cashIn
    const updated = await db.cashierShift.update({
      where: { id: shift.id },
      data: {
        closedAt: new Date(),
        closingCash: parsed.data.closingCash,
        expectedCash,
        cashDelta: parsed.data.closingCash - expectedCash,
        status: 'CLOSED',
        notes: parsed.data.notes ?? shift.notes,
      },
    })
    await db.notification.create({
      data: {
        recipientId: ctx.ownerAdminId,
        type: 'SHIFT_CLOSED',
        title: 'Смена закрыта',
        body: `Заказов: ${updated.ordersCount}, продажи: ${Math.round(updated.totalSales)}`,
        data: { shiftId: updated.id },
      },
    })
    return NextResponse.json({ item: updated })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
