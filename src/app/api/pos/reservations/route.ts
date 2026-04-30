import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePosAuth, badRequest, serverError } from '@/lib/pos/auth'

const createSchema = z.object({
  tableId: z.string().nullable().optional(),
  customerName: z.string().min(1),
  customerPhone: z.string().optional().nullable(),
  partySize: z.number().int().min(1).default(2),
  startsAt: z.string(),
  durationMin: z.number().int().min(15).default(90),
  notes: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  try {
    const items = await db.reservation.findMany({
      where: {
        ownerAdminId: ctx.ownerAdminId,
        ...(from || to
          ? {
              startsAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: { table: true },
      orderBy: { startsAt: 'asc' },
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
  try {
    const created = await db.reservation.create({
      data: {
        ownerAdminId: ctx.ownerAdminId,
        tableId: parsed.data.tableId ?? null,
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone ?? null,
        partySize: parsed.data.partySize,
        startsAt: new Date(parsed.data.startsAt),
        durationMin: parsed.data.durationMin,
        notes: parsed.data.notes ?? null,
      },
      include: { table: true },
    })
    return NextResponse.json({ item: created }, { status: 201 })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
