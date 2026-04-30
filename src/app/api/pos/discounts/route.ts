import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePosAuth, badRequest, serverError } from '@/lib/pos/auth'

const createSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().nullable().optional(),
  type: z.enum(['PERCENT', 'FIXED', 'BOGO', 'BUNDLE']),
  value: z.number().nonnegative(),
  minSubtotal: z.number().nonnegative().nullable().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  usageLimit: z.number().int().nullable().optional(),
  isActive: z.boolean().default(true),
})

export async function GET(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  try {
    const items = await db.discount.findMany({
      where: { ownerAdminId: ctx.ownerAdminId },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
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
    const created = await db.discount.create({
      data: {
        ...parsed.data,
        ownerAdminId: ctx.ownerAdminId,
        startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
        endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      },
    })
    return NextResponse.json({ item: created }, { status: 201 })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
