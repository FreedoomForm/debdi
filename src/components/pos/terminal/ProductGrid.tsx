'use client'
/**
 * Product grid — left/center column on the POS terminal.
 * Tile-based layout that scales from 4 columns (tablet portrait) to
 * 8 columns (desktop) and supports keyboard search + barcode scan.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Barcode as BarcodeIcon, Star, Package, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatCurrency, attachScannerListener } from '@/lib/pos'
import type { PosProduct, PosCategory } from '@/lib/pos'

type Props = {
  products: PosProduct[]
  categories: PosCategory[]
  onSelectProduct: (product: PosProduct) => void
  onScan?: (code: string) => void
  currency?: string
  isLoading?: boolean
}

export function ProductGrid({
  products,
  categories,
  onSelectProduct,
  onScan,
  currency = 'UZS',
  isLoading,
}: Props) {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | 'all' | 'favorites'>(
    'favorites'
  )
  const searchRef = useRef<HTMLInputElement>(null)

  // Global barcode scanner listener — fires while we're on the POS page,
  // even if the search box isn't focused.
  useEffect(() => {
    if (!onScan) return
    return attachScannerListener({
      onScan: (code) => {
        onScan(code)
      },
      ignoreWhenInputFocused: true,
      minLength: 6,
    })
  }, [onScan])

  // Hotkey: `/` focuses search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        setQuery('')
        searchRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products
      .filter((p) => p.isActive)
      .filter((p) => {
        if (activeCategory === 'all') return true
        if (activeCategory === 'favorites') return p.isFavorite
        return p.categoryId === activeCategory
      })
      .filter((p) => {
        if (!q) return true
        return (
          p.name.toLowerCase().includes(q) ||
          (p.sku ?? '').toLowerCase().includes(q) ||
          (p.barcode ?? '').toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q)
        )
      })
  }, [products, activeCategory, query])

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Search & scan bar */}
      <div className="border-b border-border bg-card px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              type="search"
              placeholder="Поиск товара, сканировать ШК (нажмите /)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && query.trim()) {
                  // Treat manual Enter as a barcode-like lookup.
                  onScan?.(query.trim())
                }
              }}
              className="h-10 pl-9 pr-9"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Очистить"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            title="Сканировать камерой"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('pos:open-camera-scanner'))
            }}
          >
            <BarcodeIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Category chips */}
      <div className="border-b border-border bg-card px-3 py-2">
        <ScrollArea className="w-full">
          <div className="flex gap-1.5">
            <CategoryChip
              label="Избранное"
              icon={<Star className="h-3.5 w-3.5" />}
              active={activeCategory === 'favorites'}
              onClick={() => setActiveCategory('favorites')}
            />
            <CategoryChip
              label="Все"
              icon={<Package className="h-3.5 w-3.5" />}
              active={activeCategory === 'all'}
              onClick={() => setActiveCategory('all')}
            />
            {categories.map((c) => (
              <CategoryChip
                key={c.id}
                label={c.name}
                color={c.color}
                active={activeCategory === c.id}
                onClick={() => setActiveCategory(c.id)}
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Grid */}
      <ScrollArea className="flex-1 px-3 py-3">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/5] animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 py-20 text-center">
            <div className="mb-3 grid h-16 w-16 place-items-center rounded-full bg-muted text-muted-foreground">
              <Package className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium">Ничего не найдено</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Попробуйте изменить запрос или категорию.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {visibleProducts.map((p) => (
              <ProductTile
                key={p.id}
                product={p}
                onClick={() => onSelectProduct(p)}
                currency={currency}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

function CategoryChip({
  label,
  icon,
  color,
  active,
  onClick,
}: {
  label: string
  icon?: React.ReactNode
  color?: string | null
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
      style={
        active && color
          ? { backgroundColor: color, borderColor: color, color: '#fff' }
          : undefined
      }
    >
      {icon}
      {label}
    </button>
  )
}

function ProductTile({
  product,
  onClick,
  currency,
}: {
  product: PosProduct
  onClick: () => void
  currency: string
}) {
  const lowStock =
    product.trackStock &&
    typeof product.reorderLevel === 'number' &&
    product.stockOnHand <= (product.reorderLevel || 0)

  const outOfStock = product.trackStock && product.stockOnHand <= 0
  const tileColor = product.color || product.category?.color || undefined

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={outOfStock}
      className={cn(
        'group relative flex aspect-[4/5] flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition',
        'hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground',
        'active:translate-y-0 active:shadow-sm',
        outOfStock && 'cursor-not-allowed opacity-50'
      )}
    >
      <div
        className="relative flex-1"
        style={
          tileColor
            ? {
                background: `linear-gradient(135deg, ${tileColor}22, ${tileColor}66)`,
              }
            : undefined
        }
      >
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl font-bold tracking-tight text-foreground/30">
            {product.name
              .split(' ')
              .slice(0, 2)
              .map((w) => w[0])
              .join('')
              .toUpperCase()}
          </div>
        )}
        {product.isFavorite && (
          <div className="absolute right-1.5 top-1.5">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          </div>
        )}
        {lowStock && !outOfStock && (
          <div className="absolute left-1.5 top-1.5">
            <Badge variant="destructive" className="px-1 py-0 text-[9px]">
              Мало
            </Badge>
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 grid place-items-center bg-background/70 text-xs font-semibold text-destructive">
            Нет в наличии
          </div>
        )}
      </div>
      <div className="border-t border-border bg-card px-2.5 py-2">
        <div className="line-clamp-2 min-h-[2.4em] text-[12px] font-medium leading-tight">
          {product.name}
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-sm font-bold tabular-nums">
            {formatCurrency(product.sellPrice, currency as any)}
          </span>
          {product.trackStock && (
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {product.stockOnHand} {product.unit}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
