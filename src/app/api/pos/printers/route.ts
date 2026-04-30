import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePosAuth, badRequest, serverError } from '@/lib/pos/auth'

const createSchema = z.object({
  name: z.string().min(1).max(64),
  type: z.enum(['RECEIPT', 'KITCHEN', 'BAR', 'LABEL', 'REPORT']).default('RECEIPT'),
  connection: z.enum(['network', 'bluetooth', 'usb']).default('network'),
  ipAddress: z.string().nullable().optional(),
  port: z.number().int().min(1).max(65535).nullable().optional(),
  bluetoothMac: z.string().nullable().optional(),
  paperWidth: z.enum(['80mm', '58mm']).default('80mm'),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  notes: z.string().nullable().optional(),
})

export async function GET(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  try {
    const items = await db.printerDevice.findMany({
      where: { ownerAdminId: ctx.ownerAdminId },
      orderBy: [{ type: 'asc' }, { isDefault: 'desc' }, { name: 'asc' }],
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
    // If marking as default, unset other defaults of the same type.
    if (parsed.data.isDefault) {
      await db.printerDevice.updateMany({
        where: {
          ownerAdminId: ctx.ownerAdminId,
          type: parsed.data.type,
          isDefault: true,
        },
        data: { isDefault: false },
      })
    }
    const created = await db.printerDevice.create({
      data: { ...parsed.data, ownerAdminId: ctx.ownerAdminId },
    })
    return NextResponse.json({ item: created }, { status: 201 })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
