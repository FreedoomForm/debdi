'use client'
/**
 * Cart panel — sticky right column on the POS terminal.
 * Lists cart lines, totals, customer/table tag, action buttons.
 *
 * Visually consistent with the rest of the admin shell:
 *   • amber accent (`--main`) for the primary CTA
 *   • deep-navy primary text & muted slate captions
 *   • compact row spacing tuned for tablet POS hardware
 */
import { useMemo, useState } from 'react'
import {
  CreditCard,
  MinusCircle,
  PlusCircle,
  Receipt as ReceiptIcon,
  Trash2,
  User,
  Utensils,
  X,
  Percent,
  StickyNote,
  Tag,
  Hash,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/pos'
import type { CartTotals, CartLine, ServiceMode } from '@/lib/pos'

const SERVICE_MODES: Array<{ value: ServiceMode; label: string; icon: string }> = [
  { value: 'DINE_IN', label: 'В зале', icon: '🍽️' },
  { value: 'TAKEAWAY', label: 'С собой', icon: '🥡' },
  { value: 'DELIVERY', label: 'Доставка', icon: '🛵' },
  { value: 'DRIVE_THRU', label: 'Drive-thru', icon: '🚗' },
]

type Props = {
  lines: CartLine[]
  totals: CartTotals
  serviceMode: ServiceMode
  customerName?: string | null
  customerPhone?: string | null
  tableLabel?: string | null
  cartDiscount: number
  cartDiscountIsPercent: boolean
  tip: number
  notes: string
  onIncrement: (id: string, delta: number) => void
  onRemove: (id: string) => void
  onClear: () => void
  onChangeServiceMode: (mode: ServiceMode) => void
  onOpenCustomerPicker: () => void
  onOpenTablePicker: () => void
  onChangeDiscount: (value: number, isPercent: boolean) => void
  onChangeTip: (tip: number) => void
  onChangeNotes: (notes: string) => void
  onCheckout: () => void
  onPark: () => void
  isCheckoutDisabled?: boolean
  currency?: string
}

export function CartPanel({
  lines,
  totals,
  serviceMode,
  customerName,
  customerPhone,
  tableLabel,
  cartDiscount,
  cartDiscountIsPercent,
  tip,
  notes,
  onIncrement,
  onRemove,
  onClear,
  onChangeServiceMode,
  onOpenCustomerPicker,
  onOpenTablePicker,
  onChangeDiscount,
  onChangeTip,
  onChangeNotes,
  onCheckout,
  onPark,
  isCheckoutDisabled,
  currency = 'UZS',
}: Props) {
  const [discountOpen, setDiscountOpen] = useState(false)
  const [tipOpen, setTipOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)

  const isEmpty = lines.length === 0

  return (
    <div className="flex h-full w-full flex-col bg-card">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ReceiptIcon className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold tracking-tight">Чек</h2>
            {!isEmpty && (
              <Badge variant="secondary" className="text-[10px] font-medium">
                {totals.itemsCount} поз.
              </Badge>
            )}
          </div>
          {!isEmpty && (
            <button
              type="button"
              className="text-xs font-medium text-muted-foreground hover:text-destructive"
              onClick={onClear}
            >
              Очистить
            </button>
          )}
        </div>
        {/* Service mode selector */}
        <div className="mt-3 grid grid-cols-4 gap-1 rounded-lg bg-muted p-1">
          {SERVICE_MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => onChangeServiceMode(m.value)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 rounded-md py-1.5 text-[10px] font-medium transition',
                serviceMode === m.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="text-base">{m.icon}</span>
              <span className="leading-none">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Customer / Table tags */}
      <div className="grid grid-cols-2 gap-2 border-b border-border bg-secondary/40 px-4 py-2.5">
        <button
          type="button"
          onClick={onOpenCustomerPicker}
          className="flex items-center gap-2 rounded-md bg-background px-2.5 py-2 text-left text-sm shadow-sm transition hover:bg-accent"
        >
          <User className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Клиент
            </div>
            <div className="truncate text-xs font-medium">
              {customerName || 'Гость'}
              {customerPhone ? (
                <span className="ml-1 text-muted-foreground">
                  · {customerPhone}
                </span>
              ) : null}
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={onOpenTablePicker}
          disabled={serviceMode !== 'DINE_IN'}
          className={cn(
            'flex items-center gap-2 rounded-md bg-background px-2.5 py-2 text-left text-sm shadow-sm transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          <Utensils className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Стол
            </div>
            <div className="truncate text-xs font-medium">
              {tableLabel || (serviceMode === 'DINE_IN' ? 'Без стола' : '—')}
            </div>
          </div>
        </button>
      </div>

      {/* Lines */}
      <ScrollArea className="flex-1">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
            <div className="mb-3 grid h-16 w-16 place-items-center rounded-full bg-muted text-muted-foreground">
              <ReceiptIcon className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium">Чек пуст</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Выберите товары из каталога слева, чтобы добавить их в чек.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {lines.map((line) => (
              <CartLineRow
                key={line.id}
                line={line}
                onIncrement={onIncrement}
                onRemove={onRemove}
                currency={currency}
              />
            ))}
          </ul>
        )}
      </ScrollArea>

      {/* Modifiers (discount / tip / notes) */}
      {!isEmpty && (
        <div className="border-t border-border bg-card">
          <div className="grid grid-cols-3 gap-1 p-2">
            <Modifier
              icon={<Percent className="h-3.5 w-3.5" />}
              label={
                cartDiscount > 0
                  ? cartDiscountIsPercent
                    ? `${cartDiscount}%`
                    : formatCurrency(cartDiscount, currency as any)
                  : 'Скидка'
              }
              active={cartDiscount > 0}
              onClick={() => setDiscountOpen((v) => !v)}
            />
            <Modifier
              icon={<Tag className="h-3.5 w-3.5" />}
              label={tip > 0 ? formatCurrency(tip, currency as any) : 'Чаевые'}
              active={tip > 0}
              onClick={() => setTipOpen((v) => !v)}
            />
            <Modifier
              icon={<StickyNote className="h-3.5 w-3.5" />}
              label={notes ? 'Заметка ✓' : 'Заметка'}
              active={!!notes}
              onClick={() => setNotesOpen((v) => !v)}
            />
          </div>
          {discountOpen && (
            <div className="border-t border-border bg-secondary/30 px-3 py-2">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={cartDiscount || ''}
                  onChange={(e) =>
                    onChangeDiscount(
                      Number(e.target.value || 0),
                      cartDiscountIsPercent
                    )
                  }
                  placeholder="0"
                  className="h-8"
                />
                <div className="flex overflow-hidden rounded-md border border-border">
                  <button
                    type="button"
                    className={cn(
                      'px-2 py-1 text-xs font-medium',
                      !cartDiscountIsPercent
                        ? 'bg-foreground text-background'
                        : 'bg-background text-muted-foreground'
                    )}
                    onClick={() => onChangeDiscount(cartDiscount, false)}
                  >
                    {currency}
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'px-2 py-1 text-xs font-medium',
                      cartDiscountIsPercent
                        ? 'bg-foreground text-background'
                        : 'bg-background text-muted-foreground'
                    )}
                    onClick={() => onChangeDiscount(cartDiscount, true)}
                  >
                    %
                  </button>
                </div>
              </div>
            </div>
          )}
          {tipOpen && (
            <div className="border-t border-border bg-secondary/30 px-3 py-2">
              <div className="flex items-center gap-1.5">
                {[5, 10, 15, 20].map((pct) => {
                  const value = Math.round(
                    (totals.subtotal - totals.discountTotal) * (pct / 100)
                  )
                  return (
                    <button
                      key={pct}
                      type="button"
                      className={cn(
                        'flex-1 rounded-md border border-border px-2 py-1.5 text-[11px] font-medium transition',
                        tip === value
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'bg-background hover:bg-accent'
                      )}
                      onClick={() => onChangeTip(value)}
                    >
                      {pct}%
                    </button>
                  )
                })}
                <Input
                  type="number"
                  inputMode="numeric"
                  value={tip || ''}
                  onChange={(e) => onChangeTip(Number(e.target.value || 0))}
                  placeholder="0"
                  className="h-8 flex-1"
                />
              </div>
            </div>
          )}
          {notesOpen && (
            <div className="border-t border-border bg-secondary/30 px-3 py-2">
              <Input
                value={notes}
                onChange={(e) => onChangeNotes(e.target.value)}
                placeholder="Например, без лука / горячее сразу"
                className="h-8"
              />
            </div>
          )}
        </div>
      )}

      {/* Totals + checkout */}
      <div className="border-t border-border bg-card px-4 py-3">
        <dl className="space-y-1 text-sm">
          <Row
            label="Подытог"
            value={formatCurrency(totals.subtotal, currency as any)}
          />
          {totals.discountTotal > 0 && (
            <Row
              label="Скидка"
              value={`-${formatCurrency(totals.discountTotal, currency as any)}`}
              tone="danger"
            />
          )}
          {totals.taxTotal > 0 && (
            <Row
              label="Налог"
              value={formatCurrency(totals.taxTotal, currency as any)}
            />
          )}
          {totals.tipTotal > 0 && (
            <Row
              label="Чаевые"
              value={formatCurrency(totals.tipTotal, currency as any)}
            />
          )}
          <Separator className="my-1.5" />
          <div className="flex items-baseline justify-between">
            <dt className="text-sm font-semibold">Итого</dt>
            <dd className="text-2xl font-bold tracking-tight">
              {formatCurrency(totals.grandTotal, currency as any)}
            </dd>
          </div>
        </dl>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            onClick={onPark}
            disabled={isEmpty}
            className="h-12"
          >
            <Hash className="mr-1.5 h-4 w-4" />
            Отложить
          </Button>
          <Button
            onClick={onCheckout}
            disabled={isEmpty || isCheckoutDisabled}
            className="col-span-2 h-12 bg-foreground text-background hover:bg-foreground/90"
          >
            <CreditCard className="mr-2 h-5 w-5" />
            Оплата · {formatCurrency(totals.grandTotal, currency as any)}
          </Button>
        </div>
      </div>
    </div>
  )
}

function CartLineRow({
  line,
  onIncrement,
  onRemove,
  currency,
}: {
  line: CartLine
  onIncrement: (id: string, delta: number) => void
  onRemove: (id: string) => void
  currency: string
}) {
  const lineTotal = useMemo(() => {
    const modSum = (line.modifiers || []).reduce(
      (s, m) => s + (m.priceDelta || 0),
      0
    )
    return (line.unitPrice + modSum) * line.quantity - (line.discount || 0)
  }, [line])

  return (
    <li className="flex items-start gap-2.5 px-3 py-2">
      <div
        className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md bg-muted text-xs font-semibold text-muted-foreground"
        style={line.color ? { backgroundColor: `${line.color}22`, color: line.color } : undefined}
      >
        {line.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={line.imageUrl}
            alt=""
            className="h-full w-full rounded-md object-cover"
          />
        ) : (
          line.name
            .split(' ')
            .slice(0, 2)
            .map((w) => w[0])
            .join('')
            .toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 text-sm font-medium leading-tight">
            {line.name}
          </div>
          <button
            type="button"
            onClick={() => onRemove(line.id)}
            className="text-muted-foreground hover:text-destructive"
            aria-label="Удалить"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {line.modifiers && line.modifiers.length > 0 && (
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {line.modifiers.map((m) => m.name).join(' · ')}
          </div>
        )}
        {line.notes && (
          <div className="mt-0.5 text-[11px] italic text-amber-600">
            ✎ {line.notes}
          </div>
        )}
        <div className="mt-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onIncrement(line.id, -1)}
              className="grid h-6 w-6 place-items-center rounded-full bg-muted text-foreground hover:bg-muted/80"
              aria-label="Уменьшить"
            >
              <MinusCircle className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[24px] text-center text-sm font-semibold tabular-nums">
              {line.quantity}
            </span>
            <button
              type="button"
              onClick={() => onIncrement(line.id, +1)}
              className="grid h-6 w-6 place-items-center rounded-full bg-muted text-foreground hover:bg-muted/80"
              aria-label="Увеличить"
            >
              <PlusCircle className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="text-sm font-semibold tabular-nums">
            {formatCurrency(lineTotal, currency as any)}
          </div>
        </div>
      </div>
    </li>
  )
}

function Row({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'danger'
}) {
  return (
    <div className="flex items-baseline justify-between text-xs">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'tabular-nums',
          tone === 'danger' && 'text-destructive font-medium'
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function Modifier({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-[11px] font-medium transition',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'bg-background text-muted-foreground hover:text-foreground'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
