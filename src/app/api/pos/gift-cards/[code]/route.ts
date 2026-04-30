import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePosAuth, badRequest, serverError } from '@/lib/pos/auth'

const updateSchema = z.object({
  isActive: z.boolean().optional(),
  expiresAt: z.string().nullable().optional(),
  issuedToName: z.string().nullable().optional(),
  issuedToPhone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

async function ensureOwnership(code: string, ownerAdminId: string) {
  const existing = await db.giftCard.findUnique({
    where: { code: code.toUpperCase() },
    select: { id: true, ownerAdminId: true, code: true },
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
  context: { params: Promise<{ code: string }> }
) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { code } = await context.params
  const json = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(json)
  if (!parsed.success) return badRequest(parsed.error.message)

  try {
    const own = await ensureOwnership(code, ctx.ownerAdminId)
    if ('error' in own) return own.error

    const data: Record<string, unknown> = { ...parsed.data }
    if ('expiresAt' in parsed.data) {
      data.expiresAt = parsed.data.expiresAt
        ? new Date(parsed.data.expiresAt)
        : null
    }

    const updated = await db.giftCard.update({
      where: { id: own.existing.id },
      data,
    })
    return NextResponse.json({ item: updated })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { code } = await context.params
  try {
    const own = await ensureOwnership(code, ctx.ownerAdminId)
    if ('error' in own) return own.error

    // Delete redemptions first (FK), then the card itself.
    await db.giftCardRedemption.deleteMany({
      where: { giftCardId: own.existing.id },
    })
    await db.giftCard.delete({ where: { id: own.existing.id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
