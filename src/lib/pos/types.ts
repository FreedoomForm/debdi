/**
 * Shared TypeScript types for the POS layer.
 * These mirror the Prisma models but are decoupled from the @prisma/client
 * runtime so client components can stay light.
 */

export type ServiceMode = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'DRIVE_THRU'

export type OrderItemModifier = {
  id: string
  name: string
  priceDelta: number
}

export type CartLine = {
  id: string                // local cart line id (uuid)
  productId: string | null
  variantId?: string | null
  name: string
  sku?: string | null
  quantity: number
  unitPrice: number         // base price per unit (UZS)
  discount: number          // absolute, UZS
  taxRate: number           // 0..1
  modifiers: OrderItemModifier[]
  notes?: string
  imageUrl?: string | null
  color?: string | null
}

export type CartTotals = {
  subtotal: number
  discountTotal: number
  taxTotal: number
  tipTotal: number
  grandTotal: number
  itemsCount: number
}

export type PosProduct = {
  id: string
  name: string
  sku?: string | null
  barcode?: string | null
  description?: string | null
  imageUrl?: string | null
  color?: string | null
  categoryId?: string | null
  category?: { id: string; name: string; color?: string | null } | null
  costPrice?: number | null
  sellPrice: number
  taxRate: number
  trackStock: boolean
  stockOnHand: number
  reorderLevel?: number | null
  unit: string
  isActive: boolean
  isFavorite: boolean
  variants?: PosProductVariant[]
  modifiers?: OrderItemModifier[]
}

export type PosProductVariant = {
  id: string
  name: string
  sku?: string | null
  barcode?: string | null
  priceDelta: number
  stockOnHand: number
  isActive: boolean
}

export type PosCategory = {
  id: string
  name: string
  color?: string | null
  icon?: string | null
  parentId?: string | null
  sortOrder: number
}

export type PosTable = {
  id: string
  name: string
  sectionId?: string | null
  section?: { id: string; name: string; color?: string | null } | null
  capacity: number
  shape: 'rect' | 'circle' | 'square'
  positionX: number
  positionY: number
  width: number
  height: number
  status: TableStatusValue
  currentOrderId?: string | null
}

export type TableStatusValue =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'RESERVED'
  | 'CLEANING'
  | 'BLOCKED'

export type PosShift = {
  id: string
  cashierId: string
  cashierName?: string
  registerId?: string | null
  openedAt: string
  closedAt?: string | null
  openingFloat: number
  closingCash?: number | null
  expectedCash?: number | null
  cashDelta?: number | null
  totalSales: number
  totalTax: number
  totalDiscount: number
  totalTips: number
  ordersCount: number
  status: 'OPEN' | 'CLOSED' | 'RECONCILED'
  notes?: string | null
}

export type PosPayment = {
  id: string
  orderId: string
  method: 'CASH' | 'CARD' | 'TRANSFER'
  amount: number
  tip: number
  changeGiven: number
  reference?: string | null
  status:
    | 'PENDING'
    | 'COMPLETED'
    | 'FAILED'
    | 'REFUNDED'
    | 'PARTIALLY_REFUNDED'
    | 'VOIDED'
  processedAt: string
  refundedAmount: number
}

export type PosLoyaltyMember = {
  id: string
  customerId: string
  programId: string
  points: number
  lifetimeSpent: number
  tier?: string | null
  joinedAt: string
}

export type PosDiscount = {
  id: string
  name: string
  code?: string | null
  type: 'PERCENT' | 'FIXED' | 'BOGO' | 'BUNDLE'
  value: number
  minSubtotal?: number | null
  startsAt?: string | null
  endsAt?: string | null
  usageLimit?: number | null
  usageCount: number
  isActive: boolean
}

export type PosPrinter = {
  id: string
  name: string
  type: 'RECEIPT' | 'KITCHEN' | 'BAR' | 'LABEL' | 'REPORT'
  connection: 'network' | 'bluetooth' | 'usb'
  ipAddress?: string | null
  port?: number | null
  bluetoothMac?: string | null
  paperWidth: '80mm' | '58mm'
  isDefault: boolean
  isActive: boolean
}

export type ReceiptPayload = {
  receiptNumber: string
  storeName: string
  storeAddress?: string
  storePhone?: string
  cashierName?: string
  orderNumber: number | string
  items: Array<{
    name: string
    quantity: number
    unitPrice: number
    total: number
    modifiers?: OrderItemModifier[]
    notes?: string | null
  }>
  subtotal: number
  discountTotal: number
  taxTotal: number
  tipTotal: number
  grandTotal: number
  payments: Array<{ method: string; amount: number; reference?: string | null }>
  changeGiven?: number
  customerName?: string | null
  customerPhone?: string | null
  loyaltyEarned?: number
  loyaltyBalance?: number
  footerNote?: string
  printedAt: string
  currency: string
}
