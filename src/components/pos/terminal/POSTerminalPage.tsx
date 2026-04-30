'use client'
/**
 * Top-level POS terminal page. Composes the product grid, cart panel,
 * payment dialog, product-detail dialog, and camera scanner into one
 * cohesive checkout experience.
 *
 * Layout: 2-column on tablet/desktop (grid 2/3 + 1/3),
 *         single-column with bottom-sheet cart on mobile.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
  ShoppingCart,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCart } from './use-cart'
import { ProductGrid } from './ProductGrid'
import { CartPanel } from './CartPanel'
import { PaymentDialog, type PaymentInput } from './PaymentDialog'
import { ProductDetailDialog } from './ProductDetailDialog'
import { CameraScanner } from './CameraScanner'
import {
  formatCurrency,
  type PosCategory,
  type PosProduct,
} from '@/lib/pos'

type Props = {
  initialProducts?: PosProduct[]
  initialCategories?: PosCategory[]
  shiftId?: string | null
  cashierName?: string
  storeName?: string
  currency?: string
}

export function POSTerminalPage({
  initialProducts = [],
  initialCategories = [],
  shiftId,
  cashierName,
  storeName = 'Debdi POS',
  currency = 'UZS',
}: Props) {
  const [products, setProducts] = useState<PosProduct[]>(initialProducts)
  const [categories, setCategories] = useState<PosCategory[]>(initialCategories)
  const [isLoading, setIsLoading] = useState(initialProducts.length === 0)
  const [detailProduct, setDetailProduct] = useState<PosProduct | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [mobileCartOpen, setMobileCartOpen] = useState(false)

  const cart = useCart()

  // Initial load from API (only when no SSR data was passed).
  useEffect(() => {
    if (initialProducts.length > 0) return
    let cancelled = false
    ;(async () => {
      setIsLoading(true)
      try {
        const [prodRes, catRes] = await Promise.all([
          fetch('/api/pos/products', { credentials: 'include' }),
          fetch('/api/pos/categories', { credentials: 'include' }),
        ])
        const prodJson = (await prodRes.json().catch(() => ({}))) as {
          items?: PosProduct[]
        }
        const catJson = (await catRes.json().catch(() => ({}))) as {
          items?: PosCategory[]
        }
        if (!cancelled) {
          setProducts(prodJson.items ?? [])
          setCategories(catJson.items ?? [])
        }
      } catch {
        toast.error('Не удалось загрузить каталог')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [initialProducts.length])

  /* ────────────────────────────────────────────────────────
     Product selection
     ──────────────────────────────────────────────────────── */
  const handleSelectProduct = useCallback(
    (product: PosProduct) => {
      const hasOptions =
        (product.variants && product.variants.length > 0) ||
        (product.modifiers && product.modifiers.length > 0)
      if (hasOptions) {
        setDetailProduct(product)
        return
      }
      cart.addProduct(product, 1, null, [])
    },
    [cart]
  )

  /* ────────────────────────────────────────────────────────
     Barcode scan handler — looks up by barcode/sku/name.
     ──────────────────────────────────────────────────────── */
  const handleScan = useCallback(
    (code: string) => {
      const trimmed = code.trim()
      if (!trimmed) return
      const found = products.find(
        (p) =>
          p.barcode === trimmed ||
          p.sku === trimmed ||
          p.name.toLowerCase() === trimmed.toLowerCase()
      )
      if (found) {
        handleSelectProduct(found)
        toast.success(`Добавлено: ${found.name}`)
      } else {
        toast.error(`Товар не найден: ${trimmed}`)
      }
    },
    [products, handleSelectProduct]
  )

  /* ────────────────────────────────────────────────────────
     Checkout — submits order + payments to API.
     ──────────────────────────────────────────────────────── */
  const handleConfirmPayment = useCallback(
    async (
      payments: PaymentInput[],
      options: { changeGiven: number }
    ) => {
      setIsProcessing(true)
      try {
        const res = await fetch('/api/pos/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            shiftId,
            customerId: cart.state.customerId,
            customerName: cart.state.customerName,
            customerPhone: cart.state.customerPhone,
            tableId: cart.state.tableId,
            guestCount: cart.state.guestCount,
            serviceMode: cart.state.serviceMode,
            cartDiscount: cart.state.cartDiscount,
            cartDiscountIsPercent: cart.state.cartDiscountIsPercent,
            tip: cart.state.tip,
            notes: cart.state.notes,
            promoCode: cart.state.appliedPromoCode,
            lines: cart.state.lines.map((l) => ({
              productId: l.productId,
              variantId: l.variantId,
              name: l.name,
              sku: l.sku,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              discount: l.discount,
              taxRate: l.taxRate,
              modifiers: l.modifiers,
              notes: l.notes,
            })),
            payments: payments.map((p) => ({
              method: p.method,
              amount: p.amount,
              reference: p.reference,
            })),
            changeGiven: options.changeGiven,
          }),
        })
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(text || `HTTP ${res.status}`)
        }
        const data = (await res.json()) as {
          orderId?: string
          orderNumber?: number | string
          receiptUrl?: string
        }

        toast.success(
          `Заказ #${data.orderNumber ?? '—'} закрыт. Сдача: ${formatCurrency(
            options.changeGiven,
            currency as any
          )}`
        )

        // Open the printable receipt in a new window.
        if (data.receiptUrl) {
          window.open(data.receiptUrl, '_blank', 'width=420,height=720')
        }
        cart.clear()
        setPaymentOpen(false)
      } catch (err) {
        toast.error(
          err instanceof Error
            ? `Не удалось закрыть заказ: ${err.message}`
            : 'Не удалось закрыть заказ'
        )
      } finally {
        setIsProcessing(false)
      }
    },
    [cart, shiftId, currency]
  )

  /* ────────────────────────────────────────────────────────
     Park (suspend) — saves cart for later recall.
     ──────────────────────────────────────────────────────── */
  const handlePark = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          shiftId,
          status: 'PENDING',
          parked: true,
          customerId: cart.state.customerId,
          customerName: cart.state.customerName,
          customerPhone: cart.state.customerPhone,
          tableId: cart.state.tableId,
          serviceMode: cart.state.serviceMode,
          lines: cart.state.lines,
          notes: cart.state.notes,
        }),
      })
      if (!res.ok) throw new Error(await res.text().catch(() => ''))
      toast.success('Заказ отложен')
      cart.clear()
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `Не удалось отложить: ${err.message}`
          : 'Не удалось отложить заказ'
      )
    }
  }, [cart, shiftId])

  /* ────────────────────────────────────────────────────────
     Customer / Table pickers — placeholder hooks; the actual
     pickers are dialog components mounted by the page. We
     dispatch global events so the page's overlays can react.
     ──────────────────────────────────────────────────────── */
  const openCustomerPicker = useCallback(() => {
    window.dispatchEvent(new CustomEvent('pos:open-customer-picker'))
  }, [])
  const openTablePicker = useCallback(() => {
    window.dispatchEvent(new CustomEvent('pos:open-table-picker'))
  }, [])

  const tableLabel = useMemo(() => {
    if (!cart.state.tableId) return null
    return `Стол ${cart.state.tableId.slice(-4)}`
  }, [cart.state.tableId])

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/middle-admin" aria-label="Назад в админку">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="text-sm font-semibold leading-tight">
              {storeName}
            </div>
            <div className="text-[11px] leading-tight text-muted-foreground">
              {cashierName ? `Кассир: ${cashierName}` : 'Терминал'}
              {shiftId ? ' · смена открыта' : ' · смена не открыта'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link href="/pos/kds">КДС</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/pos/tables">Столы</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/pos/shift">Смена</Link>
          </Button>
          {/* Mobile cart toggle */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="lg:hidden"
            onClick={() => setMobileCartOpen(true)}
          >
            <ShoppingCart className="mr-1.5 h-4 w-4" />
            <span>{cart.totals.itemsCount}</span>
            <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* Main split */}
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <ProductGrid
            products={products}
            categories={categories}
            onSelectProduct={handleSelectProduct}
            onScan={handleScan}
            currency={currency}
            isLoading={isLoading}
          />
        </div>
        {/* Desktop cart */}
        <aside className="hidden w-[380px] shrink-0 border-l border-border lg:block">
          <CartPanel
            lines={cart.state.lines}
            totals={cart.totals}
            serviceMode={cart.state.serviceMode}
            customerName={cart.state.customerName}
            customerPhone={cart.state.customerPhone}
            tableLabel={tableLabel}
            cartDiscount={cart.state.cartDiscount}
            cartDiscountIsPercent={cart.state.cartDiscountIsPercent}
            tip={cart.state.tip}
            notes={cart.state.notes}
            onIncrement={cart.incrementLine}
            onRemove={cart.removeLine}
            onClear={cart.clear}
            onChangeServiceMode={cart.setServiceMode}
            onOpenCustomerPicker={openCustomerPicker}
            onOpenTablePicker={openTablePicker}
            onChangeDiscount={cart.setCartDiscount}
            onChangeTip={cart.setTip}
            onChangeNotes={cart.setNotes}
            onCheckout={() => setPaymentOpen(true)}
            onPark={handlePark}
            currency={currency}
          />
        </aside>
        {/* Mobile cart overlay */}
        {mobileCartOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileCartOpen(false)}
            />
            <div className="absolute inset-y-0 right-0 w-[min(420px,100%)] bg-card shadow-xl">
              <div className="flex h-12 items-center justify-between border-b border-border px-3">
                <span className="text-sm font-semibold">Чек</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setMobileCartOpen(false)}
                  aria-label="Закрыть"
                >
                  <PanelRightClose className="h-4 w-4" />
                </Button>
              </div>
              <div className="h-[calc(100%-3rem)]">
                <CartPanel
                  lines={cart.state.lines}
                  totals={cart.totals}
                  serviceMode={cart.state.serviceMode}
                  customerName={cart.state.customerName}
                  customerPhone={cart.state.customerPhone}
                  tableLabel={tableLabel}
                  cartDiscount={cart.state.cartDiscount}
                  cartDiscountIsPercent={cart.state.cartDiscountIsPercent}
                  tip={cart.state.tip}
                  notes={cart.state.notes}
                  onIncrement={cart.incrementLine}
                  onRemove={cart.removeLine}
                  onClear={cart.clear}
                  onChangeServiceMode={cart.setServiceMode}
                  onOpenCustomerPicker={openCustomerPicker}
                  onOpenTablePicker={openTablePicker}
                  onChangeDiscount={cart.setCartDiscount}
                  onChangeTip={cart.setTip}
                  onChangeNotes={cart.setNotes}
                  onCheckout={() => setPaymentOpen(true)}
                  onPark={handlePark}
                  currency={currency}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mounted dialogs */}
      <ProductDetailDialog
        product={detailProduct}
        open={!!detailProduct}
        onClose={() => setDetailProduct(null)}
        onAdd={(product, quantity, variantId, modifiers, notes) => {
          cart.addProduct(product, quantity, variantId, modifiers, notes)
        }}
        currency={currency}
      />
      <PaymentDialog
        open={paymentOpen}
        totals={cart.totals}
        onClose={() => !isProcessing && setPaymentOpen(false)}
        onConfirm={handleConfirmPayment}
        isProcessing={isProcessing}
        currency={currency}
      />
      <CameraScanner onScan={handleScan} />
      {isProcessing && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-background/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 shadow-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Закрываем заказ…</span>
          </div>
        </div>
      )}
    </div>
  )
}

// silence unused-icon lint warnings while keeping helpful imports for future tweaks
void PanelRightOpen
void cn
