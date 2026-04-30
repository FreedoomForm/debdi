'use client'
/**
 * Product detail dialog — opens when a product with variants/modifiers/notes
 * is tapped. Lets the cashier configure the line before adding to cart.
 *
 * For products without variants/modifiers, the parent should add directly
 * to the cart and skip this dialog entirely.
 */
import { useEffect, useMemo, useState } from 'react'
import { Plus, Minus, Check, X } from 'lucide-react'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/pos'
import type {
  PosProduct,
  PosProductVariant,
  OrderItemModifier,
} from '@/lib/pos'

type Props = {
  product: PosProduct | null
  open: boolean
  onClose: () => void
  onAdd: (
    product: PosProduct,
    quantity: number,
    variantId: string | null,
    modifiers: OrderItemModifier[],
    notes?: string
  ) => void
  currency?: string
}

export function ProductDetailDialog({
  product,
  open,
  onClose,
  onAdd,
  currency = 'UZS',
}: Props) {
  const [quantity, setQuantity] = useState(1)
  const [variantId, setVariantId] = useState<string | null>(null)
  const [selectedModIds, setSelectedModIds] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open && product) {
      setQuantity(1)
      setVariantId(product.variants?.[0]?.id ?? null)
      setSelectedModIds(new Set())
      setNotes('')
    }
  }, [open, product])

  const variant: PosProductVariant | undefined = useMemo(() => {
    if (!product || !variantId) return undefined
    return product.variants?.find((v) => v.id === variantId)
  }, [product, variantId])

  const selectedMods = useMemo(() => {
    if (!product) return [] as OrderItemModifier[]
    return (product.modifiers || []).filter((m) => selectedModIds.has(m.id))
  }, [product, selectedModIds])

  const unitPrice = useMemo(() => {
    if (!product) return 0
    const base = product.sellPrice + (variant?.priceDelta || 0)
    const mods = selectedMods.reduce((s, m) => s + (m.priceDelta || 0), 0)
    return base + mods
  }, [product, variant, selectedMods])

  const lineTotal = unitPrice * quantity

  if (!product) return null

  const handleConfirm = () => {
    onAdd(product, quantity, variantId, selectedMods, notes || undefined)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-lg">{product.name}</DialogTitle>
          {product.description && (
            <DialogDescription>{product.description}</DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-1">
            {product.variants && product.variants.length > 0 && (
              <section>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Вариант
                </Label>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      disabled={!v.isActive}
                      onClick={() => setVariantId(v.id)}
                      className={cn(
                        'rounded-md border px-2.5 py-2 text-left transition',
                        variantId === v.id
                          ? 'border-foreground bg-foreground/5'
                          : 'border-border bg-card hover:border-foreground/40',
                        !v.isActive && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      <div className="text-sm font-medium leading-tight">
                        {v.name}
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                        {v.priceDelta === 0
                          ? 'без доплаты'
                          : `${
                              v.priceDelta > 0 ? '+' : ''
                            }${formatCurrency(v.priceDelta, currency as any)}`}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {product.modifiers && product.modifiers.length > 0 && (
              <section>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Модификаторы
                </Label>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  {product.modifiers.map((m) => {
                    const checked = selectedModIds.has(m.id)
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedModIds((prev) => {
                            const next = new Set(prev)
                            if (next.has(m.id)) next.delete(m.id)
                            else next.add(m.id)
                            return next
                          })
                        }}
                        className={cn(
                          'flex items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-left transition',
                          checked
                            ? 'border-foreground bg-foreground/5'
                            : 'border-border bg-card hover:border-foreground/40'
                        )}
                      >
                        <span className="text-sm font-medium leading-tight">
                          {m.name}
                        </span>
                        {m.priceDelta !== 0 && (
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            +{formatCurrency(m.priceDelta, currency as any)}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </section>
            )}

            <section>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Заметка к позиции
              </Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="напр. без льда, прожарка medium"
                className="mt-1.5"
              />
            </section>

            <section>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Количество
              </Label>
              <div className="mt-1.5 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="h-10 w-10"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="h-10 max-w-[100px] text-center text-base font-semibold"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="h-10 w-10"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </section>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-1.5 h-4 w-4" /> Отмена
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            <Check className="mr-1.5 h-4 w-4" />
            Добавить · {formatCurrency(lineTotal, currency as any)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
