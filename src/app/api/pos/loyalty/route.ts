import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePosAuth, badRequest, serverError } from '@/lib/pos/auth'

/**
 * Loyalty program — get/update program settings + list members.
 */

const programSchema = z.object({
  name: z.string().min(1).optional(),
  pointsPerCurrency: z.number().nonnegative().optional(),
  currencyPerPoint: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  try {
    let program = await db.loyaltyProgram.findUnique({
      where: { ownerAdminId: ctx.ownerAdminId },
      include: { tiers: { orderBy: { minPoints: 'asc' } } },
    })
    if (!program) {
      program = await db.loyaltyProgram.create({
        data: { ownerAdminId: ctx.ownerAdminId },
        include: { tiers: { orderBy: { minPoints: 'asc' } } },
      })
    }
    const members = await db.loyaltyMember.findMany({
      where: { programId: program.id },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { points: 'desc' },
      take: 200,
    })
    return NextResponse.json({ program, members })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}

export async function PATCH(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const json = await request.json().catch(() => null)
  const parsed = programSchema.safeParse(json)
  if (!parsed.success) return badRequest(parsed.error.message)
  try {
    const program = await db.loyaltyProgram.upsert({
      where: { ownerAdminId: ctx.ownerAdminId },
      create: { ownerAdminId: ctx.ownerAdminId, ...parsed.data },
      update: parsed.data,
    })
    return NextResponse.json({ program })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
