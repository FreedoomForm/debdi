import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePosAuth, badRequest, serverError } from '@/lib/pos/auth'

/**
 * GET /api/pos/tip-pool — list tip pools for the current owner.
 * POST /api/pos/tip-pool — create a new tip pool over a date range,
 * pre-populating totalAmount from CashierShift.totalTips inside the
 * window and creating one TipPoolShare per provided employee weight.
 *
 * Inspired by Toast POS tip-share workflow.
 */
const createBody = z.object({
  fromDate: z.string().datetime(),
  toDate: z.string().datetime(),
  // employeeId -> relative weight (e.g. servers 2, kitchen 1.2, support 1)
  weights: z
    .array(
      z.object({
        employeeId: z.string().min(1),
        weight: z.number().positive().max(100),
      })
    )
    .min(1)
    .max(100),
  notes: z.string().trim().max(500).optional(),
})

export async function GET(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  try {
    const items = await db.tipPool.findMany({
      where: { ownerAdminId: ctx.ownerAdminId },
      include: {
        shares: {
          select: {
            id: true,
            employeeId: true,
            weight: true,
            computedAmount: true,
            paidOut: true,
            paidOutAt: true,
          },
        },
      },
      orderBy: { fromDate: 'desc' },
      take: 100,
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
  const parsed = createBody.safeParse(json)
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid payload')
  }
  const { fromDate, toDate, weights, notes } = parsed.data

  try {
    // Compute the pool amount from cashier shifts (closed or open) whose
    // openedAt falls within the date range. If no shifts exist we still
    // create the pool with 0 — the manager can edit it later.
    const shifts = await db.cashierShift.findMany({
      where: {
        cashier: { createdBy: ctx.ownerAdminId },
        openedAt: { gte: new Date(fromDate), lte: new Date(toDate) },
      },
      select: { totalTips: true },
    })
    const totalAmount = shifts.reduce((s, x) => s + (x.totalTips ?? 0), 0)
    const sumWeight = weights.reduce((s, w) => s + w.weight, 0)

    const pool = await db.tipPool.create({
      data: {
        ownerAdminId: ctx.ownerAdminId,
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        totalAmount,
        notes: notes ?? null,
        createdBy: ctx.user.id,
        shares: {
          create: weights.map((w) => ({
            employeeId: w.employeeId,
            weight: w.weight,
            computedAmount:
              sumWeight > 0
                ? Math.round(((w.weight / sumWeight) * totalAmount) * 100) / 100
                : 0,
          })),
        },
      },
      include: { shares: true },
    })
    return NextResponse.json({ pool }, { status: 201 })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
