/** Module 04: Users Management — inspired by admin.lume.uz */
import { z } from 'zod'

export type UserRole = 'SUPER_ADMIN' | 'MIDDLE_ADMIN' | 'LOW_ADMIN' | 'COURIER' | 'CLIENT'
export type UserStatus = 'active' | 'inactive' | 'blocked' | 'pending'

export interface LumeUser {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: UserRole
  status: UserStatus
  avatar?: string | null
  createdAt: string
  lastLoginAt?: string | null
}

export const CreateUserSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7),
  password: z.string().min(8),
  role: z.enum(['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN', 'COURIER', 'CLIENT']),
  status: z.enum(['active', 'inactive', 'blocked', 'pending']).default('active'),
})

export type CreateUserInput = z.infer<typeof CreateUserSchema>

export async function listUsers(params: Record<string, unknown>) {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && sp.set(k, String(v)))
  const r = await fetch(`/api/admin/users-list?${sp}`)
  return r.json()
}

export async function createUser(input: CreateUserInput) {
  const r = await fetch('/api/admin/users-list', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function updateUser(id: string, input: Partial<CreateUserInput>) {
  const r = await fetch(`/api/admin/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  return r.json()
}

export async function toggleUserStatus(id: string) {
  const r = await fetch(`/api/admin/${id}/toggle-status`, { method: 'POST' })
  return r.json()
}
