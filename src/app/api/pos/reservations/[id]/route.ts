import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePosAuth, badRequest, serverError } from '@/lib/pos/auth'

const updateSchema = z.object({
  tableId: z.string().nullable().optional(),
  customerName: z.string().min(1).optional(),
  customerPhone: z.string().nullable().optional(),
  partySize: z.number().int().min(1).optional(),
  startsAt: z.string().optional(),
  durationMin: z.number().int().min(15).optional(),
  status: z
    .enum([
      'BOOKED',
      'CONFIRMED',
      'ARRIVED',
      'SEATED',
      'COMPLETED',
      'CANCELED',
      'NO_SHOW',
    ])
    .optional(),
  notes: z.string().nullable().optional(),
})

async function ensureOwnership(id: string, ownerAdminId: string) {
  const existing = await db.reservation.findUnique({
    where: { id },
    select: { id: true, ownerAdminId: true },
  })
  if (!existing) {
    return { error: NextResponse.json({ error: 'not_found' }, { status: 404 }) }
  }
  if (existing.ownerAdminId !== ownerAdminId) {
    return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }
  }
  return { existing }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { id } = await context.params
  const json = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(json)
  if (!parsed.success) return badRequest(parsed.error.message)
  try {
    const own = await ensureOwnership(id, ctx.ownerAdminId)
    if ('error' in own) return own.error

    const data: Record<string, unknown> = { ...parsed.data }
    if (parsed.data.startsAt) data.startsAt = new Date(parsed.data.startsAt)

    const updated = await db.reservation.update({
      where: { id },
      data,
      include: { table: true },
    })
    return NextResponse.json({ item: updated })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { id } = await context.params
  try {
    const own = await ensureOwnership(id, ctx.ownerAdminId)
    if ('error' in own) return own.error
    await db.reservation.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
