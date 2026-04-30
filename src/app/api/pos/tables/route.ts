import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePosAuth, badRequest, serverError } from '@/lib/pos/auth'

/**
 * Tables (restaurant floor plan) endpoint.
 * Lists all tables with their current status, plus sections.
 */

const createSchema = z.object({
  name: z.string().min(1).max(64),
  sectionId: z.string().optional().nullable(),
  capacity: z.number().int().min(1).default(4),
  shape: z.enum(['rect', 'circle', 'square']).default('rect'),
  positionX: z.number().default(0),
  positionY: z.number().default(0),
  width: z.number().min(20).default(80),
  height: z.number().min(20).default(80),
  status: z
    .enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'BLOCKED'])
    .default('AVAILABLE'),
})

export async function GET(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  try {
    const [tables, sections] = await Promise.all([
      db.restaurantTable.findMany({
        where: { ownerAdminId: ctx.ownerAdminId },
        include: { section: true },
        orderBy: [{ sectionId: 'asc' }, { name: 'asc' }],
      }),
      db.tableSection.findMany({
        where: { ownerAdminId: ctx.ownerAdminId },
        orderBy: { sortOrder: 'asc' },
      }),
    ])
    return NextResponse.json({ tables, sections })
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
    const created = await db.restaurantTable.create({
      data: { ...parsed.data, ownerAdminId: ctx.ownerAdminId },
    })
    return NextResponse.json({ item: created }, { status: 201 })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
