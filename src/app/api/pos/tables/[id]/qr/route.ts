import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  requirePosAuth,
  badRequest,
  notFound,
  serverError,
} from '@/lib/pos/auth'

/**
 * POST /api/pos/tables/:id/qr
 *
 * Generate or rotate a QR token for the given table. Body:
 *   { enabled: boolean, rotate?: boolean }
 *
 * Behavior:
 *  • enabled=true, no token yet  → create a new token
 *  • enabled=true, rotate=true   → replace existing token (invalidates old QR)
 *  • enabled=false               → keep token but mark qrEnabled=false (instant kill-switch)
 *
 * Inspired by Odoo PoS / Square's QR-table ordering: clients scan the
 * sticker on their table and order from their phone — staff confirm in
 * the new POS order journal.
 */
const bodySchema = z.object({
  enabled: z.boolean(),
  rotate: z.boolean().optional(),
})

type Ctx = { params: Promise<{ id: string }> }

function newToken(): string {
  // 16 random bytes → 22-char base64-url. Long enough to be unguessable,
  // short enough to fit comfortably on a printed QR sticker.
  return randomBytes(16).toString('base64url')
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { id } = await params

  const existing = await db.restaurantTable.findFirst({
    where: { id, ownerAdminId: ctx.ownerAdminId },
    select: { id: true, qrToken: true, qrEnabled: true, name: true },
  })
  if (!existing) return notFound('Стол не найден')

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid payload')
  }

  const { enabled, rotate } = parsed.data
  let nextToken = existing.qrToken
  if (enabled && (!nextToken || rotate)) {
    nextToken = newToken()
  }

  try {
    const updated = await db.restaurantTable.update({
      where: { id },
      data: {
        qrEnabled: enabled,
        qrToken: nextToken,
      },
      select: {
        id: true,
        name: true,
        qrToken: true,
        qrEnabled: true,
      },
    })

    const baseUrl =
      request.headers.get('x-forwarded-proto') && request.headers.get('host')
        ? `${request.headers.get('x-forwarded-proto')}://${request.headers.get('host')}`
        : new URL(request.url).origin

    return NextResponse.json({
      table: updated,
      publicUrl: updated.qrToken
        ? `${baseUrl}/t/${updated.qrToken}`
        : null,
    })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
