import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePosAuth, badRequest, serverError } from '@/lib/pos/auth'

const updateSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  type: z.enum(['RECEIPT', 'KITCHEN', 'BAR', 'LABEL', 'REPORT']).optional(),
  connection: z.enum(['network', 'bluetooth', 'usb']).optional(),
  ipAddress: z.string().nullable().optional(),
  port: z.number().int().min(1).max(65535).nullable().optional(),
  bluetoothMac: z.string().nullable().optional(),
  paperWidth: z.enum(['80mm', '58mm']).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().nullable().optional(),
})

async function ensureOwnership(id: string, ownerAdminId: string) {
  const existing = await db.printerDevice.findUnique({
    where: { id },
    select: { id: true, ownerAdminId: true, type: true },
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

    // If promoting to default, unset other defaults of the same type
    // (use the new type if provided, otherwise the existing one).
    if (parsed.data.isDefault) {
      const targetType = parsed.data.type ?? own.existing.type
      await db.printerDevice.updateMany({
        where: {
          ownerAdminId: ctx.ownerAdminId,
          type: targetType,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      })
    }

    const updated = await db.printerDevice.update({
      where: { id },
      data: parsed.data,
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
    await db.printerDevice.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
