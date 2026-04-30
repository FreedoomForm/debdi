import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePosAuth, badRequest, serverError } from '@/lib/pos/auth'

/**
 * Per-item KDS controls.
 *
 * PATCH /api/pos/kds/items
 *   { itemId, action: 'fire' | 'ready' | 'unfire' }
 *   { itemId, courseNumber: 1..9 | null }
 *
 * Inspired by Toast 'auto-fire timer' and Lightspeed Mar-2026
 * digital course / table pacing release.
 */
const fireSchema = z.object({
  itemId: z.string().min(1),
  action: z.enum(['fire', 'ready', 'unfire']),
})

const courseSchema = z.object({
  itemId: z.string().min(1),
  courseNumber: z.number().int().min(1).max(9).nullable(),
})

export async function PATCH(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx

  const json = await request.json().catch(() => null)
  if (!json || typeof json !== 'object') return badRequest('invalid_body')

  // Course assignment (no action field).
  if ('courseNumber' in json && !('action' in json)) {
    const parsed = courseSchema.safeParse(json)
    if (!parsed.success) return badRequest(parsed.error.message)
    const { itemId, courseNumber } = parsed.data

    try {
      const item = await db.orderItem.findFirst({
        where: { id: itemId, order: { adminId: ctx.ownerAdminId } },
        select: { id: true },
      })
      if (!item) return badRequest('item_not_found')
      const updated = await db.orderItem.update({
        where: { id: itemId },
        data: { courseNumber },
      })
      return NextResponse.json({ item: updated })
    } catch (err) {
      return serverError(err instanceof Error ? err.message : 'unknown_error')
    }
  }

  // Fire / ready / unfire.
  const parsed = fireSchema.safeParse(json)
  if (!parsed.success) return badRequest(parsed.error.message)
  const { itemId, action } = parsed.data

  try {
    const item = await db.orderItem.findFirst({
      where: { id: itemId, order: { adminId: ctx.ownerAdminId } },
      select: { id: true, firedAt: true, readyAt: true },
    })
    if (!item) return badRequest('item_not_found')

    const now = new Date()
    const data: { firedAt?: Date | null; readyAt?: Date | null } = {}
    if (action === 'fire') {
      data.firedAt = item.firedAt ?? now
      data.readyAt = null
    } else if (action === 'ready') {
      data.firedAt = item.firedAt ?? now
      data.readyAt = now
    } else if (action === 'unfire') {
      data.firedAt = null
      data.readyAt = null
    }

    const updated = await db.orderItem.update({
      where: { id: itemId },
      data,
    })

    return NextResponse.json({ item: updated })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
