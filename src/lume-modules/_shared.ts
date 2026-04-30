/**
 * Shared utilities for all 25 lume-modules.
 * Inspired by admin.lume.uz design system.
 */
export const LUME_PALETTE = {
  primary: '#1d4ed8',
  primarySoft: '#dbeafe',
  accent: '#0ea5e9',
  surface: '#ffffff',
  surfaceMuted: '#f8fafc',
  border: '#e2e8f0',
  textPrimary: '#0f172a',
  textMuted: '#64748b',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
} as const

export const LUME_RADIUS = { sm: 8, md: 12, lg: 16, xl: 22 } as const

export type Paginated<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export function buildQueryString(params: Record<string, unknown>): string {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '' || v === 'all') return
    sp.set(k, String(v))
  })
  return sp.toString()
}

export function formatMoney(n: number, currency = 'UZS') {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n || 0)
}

export function formatDate(d: string | Date) {
  return new Date(d).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function debounce<T extends (...a: any[]) => any>(fn: T, delay = 300) {
  let t: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t)
    t = setTimeout(() => fn(...args), delay)
  }
}
