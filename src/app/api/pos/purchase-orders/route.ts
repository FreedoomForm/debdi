import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePosAuth, badRequest, serverError } from '@/lib/pos/auth'

const itemSchema = z.object({
  productId: z.string().nullable().optional(),
  warehouseItemId: z.string().nullable().optional(),
  name: z.string().min(1),
  quantity: z.number().positive(),
  unitCost: z.number().nonnegative(),
})

const createSchema = z.object({
  supplierId: z.string(),
  reference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  items: z.array(itemSchema).min(1),
})

export async function GET(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  try {
    const items = await db.purchaseOrder.findMany({
      where: { ownerAdminId: ctx.ownerAdminId },
      include: { supplier: true, items: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
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
  const totalCost = parsed.data.items.reduce(
    (s, it) => s + it.quantity * it.unitCost,
    0
  )
  try {
    const created = await db.purchaseOrder.create({
      data: {
        ownerAdminId: ctx.ownerAdminId,
        supplierId: parsed.data.supplierId,
        reference: parsed.data.reference ?? null,
        notes: parsed.data.notes ?? null,
        totalCost,
        items: {
          create: parsed.data.items.map((it) => ({
            productId: it.productId ?? null,
            warehouseItemId: it.warehouseItemId ?? null,
            name: it.name,
            quantity: it.quantity,
            unitCost: it.unitCost,
            total: it.quantity * it.unitCost,
          })),
        },
      },
      include: { supplier: true, items: true },
    })
    return NextResponse.json({ item: created }, { status: 201 })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
