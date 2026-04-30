'use client'
/**
 * KpiTile — shared KPI card used across every new POS page.
 *
 * Replaces 11 duplicated `function KPI` / `function Kpi` definitions in:
 *   admins, clients, couriers, dashboard, delivery, employees, finance,
 *   reports, statistics, warehouse, trash
 *
 * Use the `tone` prop to pick a soft pastel (emerald/rose/amber/cyan/
 * indigo/violet/lime/neutral). Optional `icon` is rendered next to the
 * label. Optional `hint` shows a tiny secondary line under the value.
 */
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type KpiTone =
  | 'emerald'
  | 'rose'
  | 'amber'
  | 'cyan'
  | 'indigo'
  | 'violet'
  | 'lime'
  | 'neutral'

const TONE_CLASSES: Record<KpiTone, string> = {
  emerald: 'border-emerald-200 bg-emerald-50/60 text-emerald-900',
  rose: 'border-rose-200 bg-rose-50/60 text-rose-900',
  amber: 'border-amber-200 bg-amber-50/60 text-amber-900',
  cyan: 'border-cyan-200 bg-cyan-50/60 text-cyan-900',
  indigo: 'border-indigo-200 bg-indigo-50/60 text-indigo-900',
  violet: 'border-violet-200 bg-violet-50/60 text-violet-900',
  lime: 'border-lime-200 bg-lime-50/60 text-lime-900',
  neutral: 'border-border bg-card text-foreground',
}

export interface KpiTileProps {
  label: string
  value: string | number
  tone?: KpiTone
  icon?: ReactNode
  hint?: string
  className?: string
}

export function KpiTile({
  label,
  value,
  tone = 'neutral',
  icon,
  hint,
  className,
}: KpiTileProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-2 shadow-sm transition',
        TONE_CLASSES[tone],
        className
      )}
    >
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-0.5 text-base font-bold tabular-nums">{value}</div>
      {hint && (
        <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>
      )}
    </div>
  )
}

export default KpiTile
