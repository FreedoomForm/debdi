import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getOwnerAdminId, getGroupAdminIds } from '@/lib/admin-scope'

const createSchema = z.object({
  subdomain: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'subdomain may contain a-z, 0-9, hyphens'),
  theme: z.record(z.unknown()).optional(),
  content: z.record(z.unknown()).optional(),
  chatEnabled: z.boolean().optional(),
})

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 })
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || !hasRole(user, ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
  }

  const where: { adminId?: { in: string[] } | string } = {}
  if (user.role !== 'SUPER_ADMIN') {
    const groupIds = await getGroupAdminIds(user)
    if (groupIds && groupIds.length > 0) where.adminId = { in: groupIds }
    else where.adminId = user.id
  }

  const sites = await db.website.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      adminId: true,
      subdomain: true,
      theme: true,
      content: true,
      chatEnabled: true,
      createdAt: true,
      updatedAt: true,
      admin: { select: { id: true, name: true, email: true } },
    },
  })
  return NextResponse.json({ items: sites })
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
  }

  const raw = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(raw)
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid payload')
  }

  const ownerAdminId = (await getOwnerAdminId(user)) ?? user.id

  // One website per owner admin
  const existing = await db.website.findUnique({ where: { adminId: ownerAdminId } })
  if (existing) {
    return badRequest('У вас уже есть сайт. Редактируйте существующий.')
  }

  // Subdomain uniqueness
  const taken = await db.website.findUnique({ where: { subdomain: parsed.data.subdomain } })
  if (taken) return badRequest('Поддомен уже занят')

  const created = await db.website.create({
    data: {
      adminId: ownerAdminId,
      subdomain: parsed.data.subdomain,
      theme: JSON.stringify(parsed.data.theme ?? {}),
      content: JSON.stringify(parsed.data.content ?? {}),
      chatEnabled: parsed.data.chatEnabled ?? false,
    },
  })
  return NextResponse.json(created, { status: 201 })
}
