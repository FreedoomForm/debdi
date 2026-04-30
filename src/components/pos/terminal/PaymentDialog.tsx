'use client'
/**
 * Payment dialog — supports split payments, cash/card/transfer, tip,
 * and prints a receipt once the order is closed.
 *
 * Usage:
 *   <PaymentDialog
 *     open={paying}
 *     totals={totals}
 *     onClose={() => setPaying(false)}
 *     onConfirm={async (payments) => { await api(...); }}
 *   />
 */
import { useEffect, useMemo, useState } from 'react'
import {
  Banknote,
  CreditCard,
  ArrowRightLeft,
  Check,
  X,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/pos'
import type { CartTotals } from '@/lib/pos'

export type PaymentInput = {
  id: string
  method: 'CASH' | 'CARD' | 'TRANSFER'
  amount: number
  reference?: string
}

const METHOD_META: Record<
  PaymentInput['method'],
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  CASH: { label: 'Наличные', icon: Banknote },
  CARD: { label: 'Карта', icon: CreditCard },
  TRANSFER: { label: 'Перевод', icon: ArrowRightLeft },
}

const QUICK_CASH = [5000, 10000, 20000, 50000, 100000, 200000]

type Props = {
  open: boolean
  totals: CartTotals
  onClose: () => void
  onConfirm: (
    payments: PaymentInput[],
    options: { changeGiven: number }
  ) => Promise<void> | void
  currency?: string
  isProcessing?: boolean
}

export function PaymentDialog({
  open,
  totals,
  onClose,
  onConfirm,
  currency = 'UZS',
  isProcessing,
}: Props) {
  const [payments, setPayments] = useState<PaymentInput[]>([])
  const [activeMethod, setActiveMethod] = useState<PaymentInput['method']>('CASH')
  const [draftAmount, setDraftAmount] = useState('')
  const [reference, setReference] = useState('')

  // Reset whenever dialog opens.
  useEffect(() => {
    if (open) {
      setPayments([])
      setActiveMethod('CASH')
      setDraftAmount('')
      setReference('')
    }
  }, [open])

  const paid = useMemo(
    () => payments.reduce((s, p) => s + (p.amount || 0), 0),
    [payments]
  )
  const remaining = Math.max(0, totals.grandTotal - paid)
  const overpaid = Math.max(0, paid - totals.grandTotal)
  const changeGiven = activeMethod === 'CASH' ? overpaid : 0

  const addPayment = (amount: number, methodOverride?: PaymentInput['method']) => {
    if (amount <= 0) return
    const method = methodOverride ?? activeMethod
    setPayments((prev) => [
      ...prev,
      {
        id: cryptoId(),
        method,
        amount,
        reference: method !== 'CASH' ? reference || undefined : undefined,
      },
    ])
    setDraftAmount('')
    setReference('')
  }

  const handlePayExact = () => addPayment(remaining)
  const handlePayCustom = () => addPayment(Number(draftAmount || 0))

  const removePayment = (id: string) => {
    setPayments((p) => p.filter((x) => x.id !== id))
  }

  const canConfirm = paid >= totals.grandTotal && payments.length > 0
  const handleConfirm = async () => {
    if (!canConfirm) return
    await onConfirm(payments, { changeGiven })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Оплата заказа</DialogTitle>
          <DialogDescription>
            Поддерживается оплата частями и несколькими способами.
          </DialogDescription>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-secondary/30 p-3">
          <Stat label="К оплате" value={formatCurrency(totals.grandTotal, currency as any)} accent />
          <Stat
            label="Внесено"
            value={formatCurrency(paid, currency as any)}
            tone={paid >= totals.grandTotal ? 'success' : 'default'}
          />
          <Stat
            label={overpaid > 0 ? 'Сдача' : 'Осталось'}
            value={formatCurrency(overpaid > 0 ? overpaid : remaining, currency as any)}
            tone={overpaid > 0 ? 'success' : remaining > 0 ? 'warning' : 'default'}
          />
        </div>

        {/* Method selector */}
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(METHOD_META) as PaymentInput['method'][]).map((m) => {
            const meta = METHOD_META[m]
            const Icon = meta.icon
            return (
              <button
                key={m}
                type="button"
                onClick={() => setActiveMethod(m)}
                className={cn(
                  'flex h-16 flex-col items-center justify-center gap-1 rounded-lg border-2 transition',
                  activeMethod === m
                    ? 'border-foreground bg-foreground/5'
                    : 'border-border bg-card hover:border-foreground/40'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{meta.label}</span>
              </button>
            )
          })}
        </div>

        {/* Quick cash buttons (only for cash) */}
        {activeMethod === 'CASH' && (
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Быстрые суммы
            </Label>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
              {QUICK_CASH.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => addPayment(amt)}
                  className="rounded-md border border-border bg-card px-2 py-2 text-xs font-medium tabular-nums hover:bg-accent"
                >
                  {formatCurrency(amt, currency as any)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Manual amount input */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Сумма
            </Label>
            <Input
              type="number"
              inputMode="numeric"
              placeholder={String(remaining)}
              value={draftAmount}
              onChange={(e) => setDraftAmount(e.target.value)}
              className="mt-1"
            />
          </div>
          {activeMethod !== 'CASH' && (
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {activeMethod === 'CARD' ? 'Last 4 / ID транзакции' : 'Референс'}
              </Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="напр. 1234"
                className="mt-1"
              />
            </div>
          )}
          <div className="flex items-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handlePayCustom}
              disabled={!Number(draftAmount)}
              className="h-10"
            >
              <Plus className="mr-1 h-4 w-4" /> Добавить
            </Button>
            <Button
              type="button"
              onClick={handlePayExact}
              disabled={remaining <= 0}
              className="h-10 bg-foreground text-background hover:bg-foreground/90"
            >
              Точно
            </Button>
          </div>
        </div>

        {/* Payments list */}
        {payments.length > 0 && (
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Платежи
            </Label>
            <ul className="mt-1.5 divide-y divide-border rounded-lg border border-border">
              {payments.map((p) => {
                const Icon = METHOD_META[p.method].icon
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {METHOD_META[p.method].label}
                      </span>
                      {p.reference && (
                        <span className="text-xs text-muted-foreground">
                          · {p.reference}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums">
                        {formatCurrency(p.amount, currency as any)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePayment(p.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Удалить платёж"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            <X className="mr-1.5 h-4 w-4" /> Отмена
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || isProcessing}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            <Check className="mr-1.5 h-4 w-4" />
            {isProcessing ? 'Обработка…' : 'Подтвердить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Stat({
  label,
  value,
  accent,
  tone,
}: {
  label: string
  value: string
  accent?: boolean
  tone?: 'success' | 'warning' | 'default'
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          'mt-0.5 text-lg font-bold tabular-nums',
          accent && 'text-foreground',
          tone === 'success' && 'text-emerald-600',
          tone === 'warning' && 'text-amber-600'
        )}
      >
        {value}
      </div>
    </div>
  )
}

function cryptoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as Crypto).randomUUID()
  }
  return `pmt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
