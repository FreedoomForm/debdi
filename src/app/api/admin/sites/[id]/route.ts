import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'

const patchSchema = z.object({
  subdomain: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  theme: z.record(z.unknown()).optional(),
  content: z.record(z.unknown()).optional(),
  chatEnabled: z.boolean().optional(),
})

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 })
}

async function ensureScope(
  user: { id: string; role: string },
  id: string
): Promise<{ ok: true } | { ok: false; res: NextResponse }> {
  const site = await db.website.findUnique({ where: { id }, select: { adminId: true } })
  if (!site) return { ok: false, res: NextResponse.json({ error: 'Сайт не найден' }, { status: 404 }) }
  if (user.role === 'SUPER_ADMIN') return { ok: true }
  const groupIds = await getGroupAdminIds(user)
  if (groupIds && groupIds.includes(site.adminId)) return { ok: true }
  if (site.adminId === user.id) return { ok: true }
  return { ok: false, res: NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 }) }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request)
  if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
  }
  const { id } = await params
  const scoped = await ensureScope(user, id)
  if (!scoped.ok) return scoped.res

  const raw = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid payload')

  if (parsed.data.subdomain) {
    const conflict = await db.website.findFirst({
      where: { subdomain: parsed.data.subdomain, NOT: { id } },
    })
    if (conflict) return badRequest('Поддомен уже занят')
  }

  const updated = await db.website.update({
    where: { id },
    data: {
      ...(parsed.data.subdomain ? { subdomain: parsed.data.subdomain } : {}),
      ...(parsed.data.theme !== undefined ? { theme: JSON.stringify(parsed.data.theme) } : {}),
      ...(parsed.data.content !== undefined ? { content: JSON.stringify(parsed.data.content) } : {}),
      ...(parsed.data.chatEnabled !== undefined ? { chatEnabled: parsed.data.chatEnabled } : {}),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request)
  if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
  }
  const { id } = await params
  const scoped = await ensureScope(user, id)
  if (!scoped.ok) return scoped.res

  await db.website.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
