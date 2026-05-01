import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePosAuth, badRequest, serverError } from '@/lib/pos/auth'

const itemSchema = z.object({
  label: z.string().trim().min(1).max(200),
  required: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
})

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  phase: z.enum(['OPENING', 'CLOSING', 'MIDSHIFT']).optional(),
  items: z.array(itemSchema).min(1).max(50).optional(),
})

async function ensureOwnership(id: string, ownerAdminId: string) {
  const existing = await db.shiftChecklistTemplate.findUnique({
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
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid payload')
  }
  try {
    const own = await ensureOwnership(id, ctx.ownerAdminId)
    if ('error' in own) return own.error

    const data: Record<string, unknown> = {}
    if (parsed.data.name !== undefined) data.name = parsed.data.name
    if (parsed.data.phase !== undefined) data.phase = parsed.data.phase

    if (parsed.data.items) {
      const items = parsed.data.items
      await db.$transaction([
        db.shiftChecklistItem.deleteMany({ where: { templateId: id } }),
        db.shiftChecklistTemplate.update({
          where: { id },
          data: {
            ...data,
            items: {
              create: items.map((it, i) => ({
                label: it.label,
                required: it.required ?? true,
                sortOrder: it.sortOrder ?? i,
              })),
            },
          },
        }),
      ])
    } else if (Object.keys(data).length > 0) {
      await db.shiftChecklistTemplate.update({ where: { id }, data })
    }

    const updated = await db.shiftChecklistTemplate.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    })
    return NextResponse.json({ template: updated })
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

    await db.shiftChecklistItem.deleteMany({ where: { templateId: id } })
    await db.shiftChecklistInstance.deleteMany({ where: { templateId: id } })
    await db.shiftChecklistTemplate.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
