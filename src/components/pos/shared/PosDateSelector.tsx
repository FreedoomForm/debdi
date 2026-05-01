'use client'
/**
 * PosDateSelector — unified date/range picker for all POS pages.
 *
 * Wraps the legacy CalendarRangeSelector with POS styling and Russian defaults.
 * Replaces native <input type="date"> across the POS UI for consistency.
 *
 * Features:
 * - Quick presets: Today, This Week, This Month
 * - Dual-month view on desktop
 * - i18n ready (default Russian)
 * - Range or single-date mode
 */
import type { DateRange } from 'react-day-picker'
import { CalendarRangeSelector } from '@/components/admin/dashboard/shared/CalendarRangeSelector'

const DEFAULT_UI_TEXT = {
  calendar: 'Календарь',
  today: 'Сегодня',
  thisWeek: 'Эта неделя',
  thisMonth: 'Этот месяц',
  clearRange: 'Сбросить',
  allTime: 'За всё время',
}

export interface PosDateSelectorProps {
  /** Current selected date range */
  value: DateRange | undefined
  /** Callback when date range changes */
  onChange: (range: DateRange | undefined) => void
  /** Override default Russian UI text */
  uiText?: Partial<typeof DEFAULT_UI_TEXT>
  /** Locale for date formatting (default: ru-RU) */
  locale?: string
  /** Additional CSS classes */
  className?: string
  /** Highlight days after the selected range (useful for availability) */
  highlightAfterRange?: boolean
  /** Compact mode for tight spaces */
  compact?: boolean
}

export function PosDateSelector({
  value,
  onChange,
  uiText,
  locale = 'ru-RU',
  className,
  highlightAfterRange = false,
  compact = false,
}: PosDateSelectorProps) {
  return (
    <CalendarRangeSelector
      value={value}
      onChange={onChange}
      uiText={{
        ...DEFAULT_UI_TEXT,
        ...uiText,
      }}
      locale={locale}
      className={compact ? 'h-9 min-w-0 w-auto' : className}
      highlightAfterRange={highlightAfterRange}
    />
  )
}

/**
 * Hook to manage date range state with sensible defaults.
 * Returns today as single-day range by default.
 */
export function usePosDateRange(initialDate?: Date) {
  const defaultDate = initialDate ?? new Date()
  defaultDate.setHours(0, 0, 0, 0)

  const [range, setRange] = useState<{ from: Date; to: Date }>({
    from: defaultDate,
    to: defaultDate,
  })

  return {
    range,
    setRange,
    /** Get ISO date string for the start of range */
    fromDate: range.from.toISOString(),
    /** Get ISO date string for the end of range */
    toDate: range.to.toISOString(),
    /** Get local ISO date string (YYYY-MM-DD) for start */
    fromLocalIso: range.from.toISOString().slice(0, 10),
    /** Get local ISO date string (YYYY-MM-DD) for end */
    toLocalIso: range.to.toISOString().slice(0, 10),
  }
}

// Need to import useState for the hook
import { useState } from 'react'

export default PosDateSelector
