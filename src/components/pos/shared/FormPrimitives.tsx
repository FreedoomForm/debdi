'use client'
/**
 * FormPrimitives — shared form helpers used across POS pages.
 *
 * Replaces local <Field>, <Toggle>, <LinkRow>, <Row> definitions duplicated
 * in SettingsPage, ProductsManagerPage, SitesPage, FinancePage, etc.
 *
 *  • Field    — label + children (form row)
 *  • Toggle   — label + hint + Switch (boolean preference row)
 *  • LinkRow  — Next.js link row with label + description (settings menu)
 *  • Row      — flex label/value row (popover details)
 */
import type { ReactNode } from 'react'
import Link from 'next/link'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

export function Field({
  label,
  children,
  full,
  className,
}: {
  label: string
  children: ReactNode
  full?: boolean
  className?: string
}) {
  return (
    <div className={cn(full && 'sm:col-span-2', className)}>
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <div className="mt-1">{children}</div>
    </div>
  )
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
  className,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
  className?: string
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border bg-secondary/30 px-3 py-2 sm:col-span-2',
        className
      )}
    >
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

export function LinkRow({
  href,
  label,
  desc,
  external,
}: {
  href: string
  label: string
  desc?: string
  external?: boolean
}) {
  const inner = (
    <>
      <div>
        <div className="font-medium">{label}</div>
        {desc && <div className="text-[11px] text-muted-foreground">{desc}</div>}
      </div>
      <span className="text-muted-foreground">→</span>
    </>
  )
  const className =
    'flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm transition hover:bg-accent'
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    )
  }
  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  )
}

export function Row({
  label,
  value,
  tone,
}: {
  label: string
  value: ReactNode
  tone?: 'emerald' | 'rose' | 'amber' | 'muted'
}) {
  const cls = tone
    ? {
        emerald: 'text-emerald-700',
        rose: 'text-rose-700',
        amber: 'text-amber-700',
        muted: 'text-muted-foreground',
      }[tone]
    : ''
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-bold tabular-nums', cls)}>{value}</span>
    </div>
  )
}
