import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePosAuth, badRequest, serverError } from '@/lib/pos/auth'

/**
 * Employee timeclock — clock in / clock out endpoints.
 *
 * GET   returns the active (open) entry for the current user, plus the
 *       last 30 closed entries for history.
 * POST  creates a new clock-in entry (refused if one is already open).
 * PATCH closes the open entry (sets clockedOutAt + optional breakMinutes).
 */

const closeSchema = z.object({
  entryId: z.string(),
  breakMinutes: z.number().int().nonnegative().optional(),
  notes: z.string().nullable().optional(),
})

export async function GET(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  try {
    const open = await db.timeclockEntry.findFirst({
      where: { employeeId: ctx.user.id, clockedOutAt: null },
    })
    const history = await db.timeclockEntry.findMany({
      where: { employeeId: ctx.user.id, clockedOutAt: { not: null } },
      orderBy: { clockedInAt: 'desc' },
      take: 30,
    })
    return NextResponse.json({ open, history })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  try {
    const existing = await db.timeclockEntry.findFirst({
      where: { employeeId: ctx.user.id, clockedOutAt: null },
    })
    if (existing) {
      return NextResponse.json({ item: existing }, { status: 200 })
    }
    const created = await db.timeclockEntry.create({
      data: {
        employeeId: ctx.user.id,
        ownerAdminId: ctx.ownerAdminId,
        clockedInAt: new Date(),
      },
    })
    return NextResponse.json({ item: created }, { status: 201 })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}

export async function PATCH(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const json = await request.json().catch(() => null)
  const parsed = closeSchema.safeParse(json)
  if (!parsed.success) return badRequest(parsed.error.message)
  try {
    const entry = await db.timeclockEntry.findUnique({
      where: { id: parsed.data.entryId },
    })
    if (!entry) return badRequest('entry_not_found')
    if (entry.employeeId !== ctx.user.id) return badRequest('not_your_entry')
    if (entry.clockedOutAt) return badRequest('already_closed')
    const updated = await db.timeclockEntry.update({
      where: { id: entry.id },
      data: {
        clockedOutAt: new Date(),
        breakMinutes: parsed.data.breakMinutes ?? entry.breakMinutes,
        notes: parsed.data.notes ?? entry.notes,
      },
    })
    return NextResponse.json({ item: updated })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
