/**
 * Currency / number / date formatting helpers used across the POS UI.
 * Defaults target the Uzbek market (UZS, ru-RU locale) but every function
 * takes overrides so individual stores can adapt.
 */

export type CurrencyCode = 'UZS' | 'USD' | 'EUR' | 'RUB' | 'KZT' | 'TJS'

const FRACTION_DIGITS_BY_CURRENCY: Record<CurrencyCode, number> = {
  UZS: 0,
  USD: 2,
  EUR: 2,
  RUB: 2,
  KZT: 0,
  TJS: 2,
}

export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'UZS',
  locale: string = 'ru-RU'
): string {
  const fractionDigits = FRACTION_DIGITS_BY_CURRENCY[currency] ?? 0
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount || 0)
  } catch {
    // Fallback if browser doesn't know the currency code
    return `${(amount || 0).toLocaleString(locale)} ${currency}`
  }
}

export function formatNumber(
  n: number,
  locale: string = 'ru-RU',
  maxFraction: number = 2
): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: maxFraction,
  }).format(n || 0)
}

export function formatPercent(
  fraction: number,
  locale: string = 'ru-RU',
  maxFraction: number = 1
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: maxFraction,
  }).format(fraction || 0)
}

export function formatDateTime(
  date: string | Date,
  locale: string = 'ru-RU'
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTime(
  date: string | Date,
  locale: string = 'ru-RU'
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateShort(
  date: string | Date,
  locale: string = 'ru-RU'
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
  })
}

export function relativeTime(
  date: string | Date,
  locale: string = 'ru-RU'
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diffMs = Date.now() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (diffSec < 60) return rtf.format(-diffSec, 'second')
  if (diffMin < 60) return rtf.format(-diffMin, 'minute')
  if (diffHour < 24) return rtf.format(-diffHour, 'hour')
  if (diffDay < 30) return rtf.format(-diffDay, 'day')
  if (diffDay < 365) return rtf.format(-Math.floor(diffDay / 30), 'month')
  return rtf.format(-Math.floor(diffDay / 365), 'year')
}
