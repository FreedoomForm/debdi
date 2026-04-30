import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  requirePosAuth,
  badRequest,
  notFound,
  serverError,
} from '@/lib/pos/auth'

/**
 * GET  /api/pos/checklists/instances?templateId=...  — list runs
 * POST /api/pos/checklists/instances                 — start a new run
 * PATCH /api/pos/checklists/instances                — toggle a response
 *   Body shapes:
 *     POST   { templateId, shiftId? }
 *     PATCH  { instanceId, itemId, checked, note? }
 *
 * Auto-completes the instance when every required item is checked.
 */
const startBody = z.object({
  templateId: z.string().min(1),
  shiftId: z.string().optional().nullable(),
})

const toggleBody = z.object({
  instanceId: z.string().min(1),
  itemId: z.string().min(1),
  checked: z.boolean(),
  note: z.string().trim().max(280).optional(),
})

export async function GET(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { searchParams } = new URL(request.url)
  const templateId = searchParams.get('templateId') || undefined
  const shiftId = searchParams.get('shiftId') || undefined
  try {
    const items = await db.shiftChecklistInstance.findMany({
      where: {
        template: { ownerAdminId: ctx.ownerAdminId },
        ...(templateId ? { templateId } : {}),
        ...(shiftId ? { shiftId } : {}),
      },
      include: {
        template: { select: { name: true, phase: true } },
        responses: true,
      },
      orderBy: { startedAt: 'desc' },
      take: 100,
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
  const parsed = startBody.safeParse(json)
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid payload')
  }
  const tpl = await db.shiftChecklistTemplate.findFirst({
    where: { id: parsed.data.templateId, ownerAdminId: ctx.ownerAdminId },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  })
  if (!tpl) return notFound('Template not found')

  try {
    const instance = await db.shiftChecklistInstance.create({
      data: {
        templateId: tpl.id,
        shiftId: parsed.data.shiftId ?? null,
        performedBy: ctx.user.id,
        responses: {
          create: tpl.items.map((it) => ({ itemId: it.id, checked: false })),
        },
      },
      include: { responses: true, template: { select: { name: true, phase: true } } },
    })
    return NextResponse.json({ instance }, { status: 201 })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}

export async function PATCH(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const json = await request.json().catch(() => null)
  const parsed = toggleBody.safeParse(json)
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid payload')
  }
  const { instanceId, itemId, checked, note } = parsed.data

  // Confirm the instance belongs to this owner via its template.
  const instance = await db.shiftChecklistInstance.findFirst({
    where: { id: instanceId, template: { ownerAdminId: ctx.ownerAdminId } },
    include: {
      template: { include: { items: true } },
      responses: true,
    },
  })
  if (!instance) return notFound('Instance not found')

  try {
    await db.shiftChecklistResponse.upsert({
      where: { instanceId_itemId: { instanceId, itemId } },
      create: {
        instanceId,
        itemId,
        checked,
        note: note ?? null,
        checkedAt: checked ? new Date() : null,
      },
      update: {
        checked,
        note: note ?? null,
        checkedAt: checked ? new Date() : null,
      },
    })

    // Auto-complete: every required item is checked → completedAt now.
    const responses = await db.shiftChecklistResponse.findMany({
      where: { instanceId },
      include: { item: { select: { required: true } } },
    })
    const allRequiredDone = responses
      .filter((r) => r.item.required)
      .every((r) => r.checked)
    if (allRequiredDone && !instance.completedAt) {
      await db.shiftChecklistInstance.update({
        where: { id: instanceId },
        data: { completedAt: new Date() },
      })
    } else if (!allRequiredDone && instance.completedAt) {
      // Un-complete if a required item is unchecked.
      await db.shiftChecklistInstance.update({
        where: { id: instanceId },
        data: { completedAt: null },
      })
    }

    const fresh = await db.shiftChecklistInstance.findUnique({
      where: { id: instanceId },
      include: { responses: true, template: { include: { items: true } } },
    })
    return NextResponse.json({ instance: fresh })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
