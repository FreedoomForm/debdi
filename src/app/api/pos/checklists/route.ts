import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePosAuth, badRequest, serverError } from '@/lib/pos/auth'

/**
 * GET /api/pos/checklists — list checklist templates for the owner.
 * POST /api/pos/checklists — create a template with items.
 *
 * Inspired by Lightspeed K-Series March 2026 digital checklists.
 */
const itemSchema = z.object({
  label: z.string().trim().min(1).max(200),
  required: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
})

const createBody = z.object({
  name: z.string().trim().min(1).max(120),
  phase: z.enum(['OPENING', 'CLOSING', 'MIDSHIFT']),
  items: z.array(itemSchema).min(1).max(50),
})

export async function GET(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  try {
    const items = await db.shiftChecklistTemplate.findMany({
      where: { ownerAdminId: ctx.ownerAdminId },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { instances: true } },
      },
      orderBy: { createdAt: 'desc' },
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
  const parsed = createBody.safeParse(json)
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid payload')
  }
  const { name, phase, items } = parsed.data
  try {
    const tpl = await db.shiftChecklistTemplate.create({
      data: {
        ownerAdminId: ctx.ownerAdminId,
        name,
        phase,
        items: {
          create: items.map((it, i) => ({
            label: it.label,
            required: it.required ?? true,
            sortOrder: it.sortOrder ?? i,
          })),
        },
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    })
    return NextResponse.json({ template: tpl }, { status: 201 })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
