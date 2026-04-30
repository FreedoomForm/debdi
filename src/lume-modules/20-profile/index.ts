/** Module 20: User Profile */
import { z } from 'zod'

export const ProfileSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  avatar: z.string().url().optional(),
  language: z.enum(['ru', 'uz', 'en']).default('ru'),
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true),
  }).default({ email: true, push: true }),
})

export type ProfileInput = z.infer<typeof ProfileSchema>

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(8),
    confirm: z.string().min(8),
  })
  .refine((d) => d.newPassword === d.confirm, {
    message: 'Пароли не совпадают',
    path: ['confirm'],
  })

export async function fetchProfile() {
  const r = await fetch('/api/admin/profile')
  return r.json()
}

export async function updateProfile(input: Partial<ProfileInput>) {
  const r = await fetch('/api/admin/profile', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  return r.json()
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const r = await fetch('/api/admin/profile/change-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}
