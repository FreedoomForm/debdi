/**
 * Module 01: Authentication & Login System
 * Inspired by admin.lume.uz authentication flow.
 *
 * Provides:
 *  - Email/phone + password login
 *  - Remember-me with extended session
 *  - JWT token verification helpers
 *  - Session middleware
 *  - Logout endpoint helpers
 *  - Password recovery primitives
 */

import { z } from 'zod'

export const LoginSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Введите email или телефон')
    .refine(
      (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || /^\+?\d{9,15}$/.test(v),
      'Неверный формат email или телефона',
    ),
  password: z.string().min(6, 'Минимум 6 символов'),
  remember: z.boolean().default(false),
})

export type LoginInput = z.infer<typeof LoginSchema>

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
})

export const ResetPasswordSchema = z
  .object({
    token: z.string().min(10),
    password: z.string().min(8),
    confirm: z.string().min(8),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Пароли не совпадают',
    path: ['confirm'],
  })

export type AuthSession = {
  userId: string
  email: string
  role: 'SUPER_ADMIN' | 'MIDDLE_ADMIN' | 'LOW_ADMIN' | 'COURIER' | 'CLIENT'
  exp: number
}

export const SESSION_COOKIE = 'lume_session'
export const SESSION_TTL_DEFAULT = 60 * 60 * 2 // 2h
export const SESSION_TTL_REMEMBER = 60 * 60 * 24 * 14 // 14d

export function isSessionExpired(s: AuthSession | null | undefined) {
  if (!s) return true
  return Date.now() / 1000 > s.exp
}

export function buildRedirectAfterLogin(role: AuthSession['role']) {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/super-admin'
    case 'MIDDLE_ADMIN':
      return '/middle-admin'
    case 'LOW_ADMIN':
      return '/low-admin'
    case 'COURIER':
      return '/courier'
    default:
      return '/'
  }
}
