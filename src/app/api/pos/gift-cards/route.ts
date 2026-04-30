import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePosAuth, badRequest, serverError } from '@/lib/pos/auth'

const createSchema = z.object({
  code: z.string().min(4).max(64).optional(),
  initialValue: z.number().positive(),
  currency: z.string().default('UZS'),
  issuedToName: z.string().nullable().optional(),
  issuedToPhone: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

function generateCode(): string {
  // Format: GC-XXXX-XXXX (12 chars total, easy to type)
  const part = () =>
    Math.random().toString(36).slice(2, 6).toUpperCase()
  return `GC-${part()}-${part()}`
}

export async function GET(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  try {
    const items = await db.giftCard.findMany({
      where: { ownerAdminId: ctx.ownerAdminId },
      orderBy: { issuedAt: 'desc' },
      take: 200,
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
  const code = parsed.data.code?.toUpperCase() ?? generateCode()
  try {
    const created = await db.giftCard.create({
      data: {
        ownerAdminId: ctx.ownerAdminId,
        code,
        initialValue: parsed.data.initialValue,
        balance: parsed.data.initialValue,
        currency: parsed.data.currency,
        issuedToName: parsed.data.issuedToName ?? null,
        issuedToPhone: parsed.data.issuedToPhone ?? null,
        expiresAt: parsed.data.expiresAt
          ? new Date(parsed.data.expiresAt)
          : null,
        notes: parsed.data.notes ?? null,
      },
    })
    return NextResponse.json({ item: created }, { status: 201 })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
