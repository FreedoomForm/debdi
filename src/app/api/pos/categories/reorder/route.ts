import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePosAuth, badRequest, serverError } from '@/lib/pos/auth'

/**
 * POST /api/pos/categories/reorder
 * Body: { ids: string[] }
 *
 * Bulk-updates the `sortOrder` of categories so the UI can drag-rearrange
 * them and persist the order in a single round-trip.
 */
const bodySchema = z.object({
  ids: z.array(z.string()).min(1).max(500),
})

export async function POST(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) return badRequest(parsed.error.message)

  try {
    await db.$transaction(
      parsed.data.ids.map((id, index) =>
        db.productCategory.updateMany({
          where: { id, ownerAdminId: ctx.ownerAdminId },
          data: { sortOrder: index },
        })
      )
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
