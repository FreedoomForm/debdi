import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePosAuth, badRequest, serverError } from '@/lib/pos/auth'

export async function GET(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { searchParams } = new URL(request.url)
  const onlyUnread = searchParams.get('unread') === '1'
  try {
    const items = await db.notification.findMany({
      where: {
        recipientId: ctx.ownerAdminId,
        ...(onlyUnread ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    const unreadCount = await db.notification.count({
      where: { recipientId: ctx.ownerAdminId, isRead: false },
    })
    return NextResponse.json({ items, unreadCount })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}

const markSchema = z.object({
  ids: z.array(z.string()).optional(),
  all: z.boolean().optional(),
})

export async function PATCH(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const json = await request.json().catch(() => null)
  const parsed = markSchema.safeParse(json)
  if (!parsed.success) return badRequest(parsed.error.message)
  try {
    if (parsed.data.all) {
      await db.notification.updateMany({
        where: { recipientId: ctx.ownerAdminId, isRead: false },
        data: { isRead: true },
      })
    } else if (parsed.data.ids?.length) {
      await db.notification.updateMany({
        where: {
          id: { in: parsed.data.ids },
          recipientId: ctx.ownerAdminId,
        },
        data: { isRead: true },
      })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
