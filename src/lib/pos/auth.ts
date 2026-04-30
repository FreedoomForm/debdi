/**
 * POS-specific auth helpers — wrap the shared `getAuthUser` and resolve the
 * "owner admin" id (i.e. the middle/super admin under whom data is scoped).
 *
 * Most POS data is owned by a middle admin; cashiers (LOW_ADMIN/WORKER) act on
 * behalf of their parent middle admin's catalog.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, type AuthUser } from '@/lib/auth-utils'

export type PosAuthContext = {
  user: AuthUser
  ownerAdminId: string
}

export async function requirePosAuth(
  request: NextRequest
): Promise<PosAuthContext | NextResponse> {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  // Resolve owner: SUPER_ADMIN/MIDDLE_ADMIN own data themselves; LOW_ADMIN
  // and COURIER/WORKER inherit the owner from their createdBy chain.
  let ownerAdminId = user.id
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'MIDDLE_ADMIN') {
    const admin = await db.admin.findUnique({
      where: { id: user.id },
      select: { createdBy: true, role: true },
    })
    if (admin?.createdBy) {
      // Walk up to find the middle admin (data owner)
      let cursor: string | null = admin.createdBy
      let safety = 0
      while (cursor && safety++ < 5) {
        const parent: { id: string; role: string; createdBy: string | null } | null =
          await db.admin.findUnique({
            where: { id: cursor },
            select: { id: true, role: true, createdBy: true },
          })
        if (!parent) break
        if (parent.role === 'MIDDLE_ADMIN' || parent.role === 'SUPER_ADMIN') {
          ownerAdminId = parent.id
          break
        }
        cursor = parent.createdBy
      }
    }
  }
  return { user, ownerAdminId }
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
}

export function badRequest(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 400 })
}

export function notFound(error = 'not_found'): NextResponse {
  return NextResponse.json({ error }, { status: 404 })
}

export function serverError(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 500 })
}
