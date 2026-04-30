import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePosAuth, badRequest, serverError } from '@/lib/pos/auth'

/**
 * POS order endpoint.
 *
 * POST creates a new sale, computes totals server-side (we never trust the
 * client total), records payments, decrements stock, generates a receipt,
 * and updates the cashier shift snapshot.
 */

const lineSchema = z.object({
  productId: z.string().nullable().optional(),
  variantId: z.string().nullable().optional(),
  name: z.string(),
  sku: z.string().nullable().optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  taxRate: z.number().min(0).max(1).default(0),
  modifiers: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        priceDelta: z.number().default(0),
      })
    )
    .default([]),
  notes: z.string().nullable().optional(),
})

const paymentSchema = z.object({
  method: z.enum(['CASH', 'CARD', 'TRANSFER']),
  amount: z.number().nonnegative(),
  reference: z.string().nullable().optional(),
  tip: z.number().nonnegative().default(0),
})

const createSchema = z.object({
  shiftId: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  customerName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  tableId: z.string().nullable().optional(),
  guestCount: z.number().int().nullable().optional(),
  serviceMode: z
    .enum(['DINE_IN', 'TAKEAWAY', 'DELIVERY', 'DRIVE_THRU'])
    .default('DINE_IN'),
  cartDiscount: z.number().nonnegative().default(0),
  cartDiscountIsPercent: z.boolean().default(false),
  tip: z.number().nonnegative().default(0),
  notes: z.string().nullable().optional(),
  promoCode: z.string().nullable().optional(),
  parked: z.boolean().default(false),
  status: z.string().nullable().optional(), // for parked orders
  lines: z.array(lineSchema).min(1),
  payments: z.array(paymentSchema).default([]),
  changeGiven: z.number().nonnegative().default(0),
})

export async function GET(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 200)
  try {
    const items = await db.order.findMany({
      where: {
        adminId: ctx.ownerAdminId,
        deletedAt: null,
        ...(status ? { orderStatus: status as any } : {}),
      },
      include: {
        items: true,
        payments: true,
        customer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return NextResponse.json({ items })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx

  const json = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(json)
  if (!parsed.success) return badRequest(parsed.error.message)

  const data = parsed.data

  // Compute totals server-side.
  const subtotal = data.lines.reduce(
    (s, l) =>
      s +
      (l.unitPrice +
        (l.modifiers || []).reduce((m, mod) => m + (mod.priceDelta || 0), 0)) *
        l.quantity,
    0
  )
  const lineDiscounts = data.lines.reduce((s, l) => s + (l.discount || 0), 0)
  const cartDiscountAbs = data.cartDiscountIsPercent
    ? subtotal * (data.cartDiscount / 100)
    : data.cartDiscount
  const discountTotal = lineDiscounts + cartDiscountAbs
  const taxTotal = data.lines.reduce(
    (s, l) =>
      s +
      Math.max(
        0,
        (l.unitPrice +
          (l.modifiers || []).reduce((m, mod) => m + (mod.priceDelta || 0), 0)) *
          l.quantity -
          (l.discount || 0)
      ) *
        (l.taxRate || 0),
    0
  )
  const grandTotal = Math.max(0, subtotal - discountTotal + taxTotal + data.tip)
  const paid = data.payments.reduce((s, p) => s + (p.amount || 0), 0)

  const isFullyPaid = paid >= grandTotal && data.payments.length > 0
  const orderStatus = data.parked
    ? 'PENDING'
    : isFullyPaid
      ? 'DELIVERED'
      : 'NEW'

  try {
    const created = await db.$transaction(async (tx) => {
      // Find or upsert customer if name/phone given without id.
      let customerId = data.customerId ?? null
      if (!customerId && data.customerPhone) {
        const existing = await tx.customer.findFirst({
          where: {
            phone: data.customerPhone,
            createdBy: ctx.ownerAdminId,
            deletedAt: null,
          },
        })
        if (existing) {
          customerId = existing.id
        } else if (data.customerName) {
          const created = await tx.customer.create({
            data: {
              name: data.customerName,
              phone: data.customerPhone,
              address: 'POS walk-in',
              createdBy: ctx.ownerAdminId,
            },
          })
          customerId = created.id
        }
      }

      // Walk-in orders need a customer per current schema. Create a default
      // POS walk-in if none provided.
      if (!customerId) {
        const walkIn = await tx.customer.upsert({
          where: {
            phone_createdBy_deletedAt: {
              phone: '__pos_walkin__',
              createdBy: ctx.ownerAdminId,
              deletedAt: null as any,
            },
          },
          create: {
            name: 'Розничный покупатель',
            phone: '__pos_walkin__',
            address: 'POS',
            createdBy: ctx.ownerAdminId,
          },
          update: {},
        })
        customerId = walkIn.id
      }

      // Generate next orderNumber.
      const last = await tx.order.findFirst({
        orderBy: { orderNumber: 'desc' },
        select: { orderNumber: true },
      })
      const nextNumber = (last?.orderNumber ?? 0) + 1

      // Create order.
      const order = await tx.order.create({
        data: {
          orderNumber: nextNumber,
          customerId: customerId!,
          deliveryAddress:
            data.serviceMode === 'DELIVERY' ? 'TBD' : 'POS on-site',
          adminId: ctx.user.id,
          orderStatus: orderStatus as any,
          paymentStatus:
            isFullyPaid ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID',
          paymentMethod: (data.payments[0]?.method ?? 'CASH') as any,
          isPrepaid: isFullyPaid,
          sourceChannel: 'POS_TERMINAL',
          subtotal,
          taxTotal,
          discountTotal,
          tipTotal: data.tip,
          grandTotal,
          guestCount: data.guestCount ?? null,
          tableId: data.tableId ?? null,
          serviceMode: data.serviceMode,
          notes: data.notes ?? null,
          quantity: Math.max(
            1,
            Math.round(data.lines.reduce((s, l) => s + l.quantity, 0))
          ),
          calories: 0,
          deliveredAt: isFullyPaid ? new Date() : null,
        },
      })

      // Create order items.
      await tx.orderItem.createMany({
        data: data.lines.map((l) => {
          const lineModSum = (l.modifiers || []).reduce(
            (s, m) => s + (m.priceDelta || 0),
            0
          )
          const lineSubtotal = (l.unitPrice + lineModSum) * l.quantity
          const lineNet = Math.max(0, lineSubtotal - (l.discount || 0))
          const lineTax = lineNet * (l.taxRate || 0)
          return {
            orderId: order.id,
            productId: l.productId ?? null,
            variantId: l.variantId ?? null,
            name: l.name,
            sku: l.sku ?? null,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discount: l.discount,
            taxRate: l.taxRate,
            total: lineNet + lineTax,
            modifiers: l.modifiers ?? [],
            notes: l.notes ?? null,
          }
        }),
      })

      // Decrement stock + log stock movements.
      // Auto-86: when a tracked product's stockOnHand drops to <= 0 we mark
      // it isActive=false so the POS grid hides it immediately. The product
      // is automatically re-enabled once stock comes back via
      // StockMovement of type 'PURCHASE' / 'ADJUSTMENT' (handled by the
      // inventory movements API).
      for (const l of data.lines) {
        if (!l.productId) continue
        const product = await tx.product.findUnique({
          where: { id: l.productId },
          select: { id: true, trackStock: true, stockOnHand: true, name: true },
        })
        if (!product || !product.trackStock) continue
        const newStock = product.stockOnHand - l.quantity
        await tx.product.update({
          where: { id: product.id },
          data: {
            stockOnHand: { decrement: l.quantity },
            // Auto-86 once we hit zero (or below).
            ...(newStock <= 0 ? { isActive: false } : {}),
          },
        })
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: 'SALE',
            quantity: -l.quantity,
            reason: `Sale order #${nextNumber}`,
            reference: order.id,
            performedBy: ctx.user.id,
          },
        })
        // Notify owner that the item is now 86'd.
        if (newStock <= 0) {
          await tx.notification.create({
            data: {
              ownerAdminId: ctx.ownerAdminId,
              type: 'LOW_STOCK',
              title: `Нет в наличии: ${product.name}`,
              body: `Товар автоматически скрыт в POS-терминале (Auto-86). Приход вернёт его в продажу.`,
              link: '/pos/products',
            },
          })
        }
      }

      // Insert payments.
      for (const p of data.payments) {
        await tx.payment.create({
          data: {
            orderId: order.id,
            shiftId: data.shiftId ?? null,
            method: p.method as any,
            amount: p.amount,
            tip: p.tip ?? 0,
            changeGiven:
              p.method === 'CASH' && data.payments.length === 1
                ? data.changeGiven
                : 0,
            reference: p.reference ?? null,
            status: 'COMPLETED' as any,
            processedBy: ctx.user.id,
          },
        })
      }

      // Update shift totals.
      if (data.shiftId) {
        await tx.cashierShift.update({
          where: { id: data.shiftId },
          data: {
            totalSales: { increment: grandTotal },
            totalTax: { increment: taxTotal },
            totalDiscount: { increment: discountTotal },
            totalTips: { increment: data.tip },
            ordersCount: { increment: 1 },
          },
        })
      }

      // Generate receipt record.
      const receiptNumber = `R-${nextNumber.toString().padStart(6, '0')}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`
      await tx.receipt.create({
        data: {
          orderId: order.id,
          receiptNumber,
          type: 'SALE',
          format: '80mm',
          payload: {
            receiptNumber,
            storeName: 'Debdi POS',
            cashierName: ctx.user.email,
            orderNumber: nextNumber,
            currency: 'UZS',
            items: data.lines.map((l) => ({
              name: l.name,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              total:
                (l.unitPrice +
                  (l.modifiers || []).reduce(
                    (s, m) => s + (m.priceDelta || 0),
                    0
                  )) *
                  l.quantity -
                (l.discount || 0),
              modifiers: l.modifiers,
              notes: l.notes,
            })),
            subtotal,
            discountTotal,
            taxTotal,
            tipTotal: data.tip,
            grandTotal,
            payments: data.payments.map((p) => ({
              method: p.method,
              amount: p.amount,
              reference: p.reference,
            })),
            changeGiven: data.changeGiven,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            printedAt: new Date().toLocaleString('ru-RU'),
          },
        },
      })

      // Loyalty points (if program is active).
      if (customerId && grandTotal > 0) {
        const program = await tx.loyaltyProgram.findUnique({
          where: { ownerAdminId: ctx.ownerAdminId },
        })
        if (program?.isActive) {
          const earned = Math.floor(
            (grandTotal / 1000) * (program.pointsPerCurrency || 1)
          )
          if (earned > 0) {
            const member = await tx.loyaltyMember.upsert({
              where: { customerId },
              create: {
                programId: program.id,
                customerId,
                points: earned,
                lifetimeSpent: grandTotal,
              },
              update: {
                points: { increment: earned },
                lifetimeSpent: { increment: grandTotal },
              },
            })
            await tx.loyaltyPointsLog.create({
              data: {
                memberId: member.id,
                delta: earned,
                reason: 'Earned from order',
                reference: order.id,
              },
            })
          }
        }
      }

      // Update customer aggregates.
      if (customerId) {
        await tx.customer.update({
          where: { id: customerId },
          data: {
            totalSpent: { increment: grandTotal },
            totalOrders: { increment: 1 },
            lastOrderAt: new Date(),
          },
        })
      }

      // Notification for low stock.
      for (const l of data.lines) {
        if (!l.productId) continue
        const p = await tx.product.findUnique({
          where: { id: l.productId },
          select: {
            id: true,
            name: true,
            stockOnHand: true,
            reorderLevel: true,
            trackStock: true,
          },
        })
        if (
          p?.trackStock &&
          typeof p.reorderLevel === 'number' &&
          p.stockOnHand <= p.reorderLevel
        ) {
          await tx.notification.create({
            data: {
              recipientId: ctx.ownerAdminId,
              type: 'LOW_STOCK',
              title: 'Заканчивается товар',
              body: `${p.name}: остаток ${p.stockOnHand}`,
              link: `/middle-admin?tab=warehouse`,
              data: { productId: p.id },
            },
          })
        }
      }

      return { order, receiptNumber }
    })

    return NextResponse.json(
      {
        orderId: created.order.id,
        orderNumber: created.order.orderNumber,
        receiptNumber: created.receiptNumber,
        receiptUrl: `/api/pos/receipts/${created.receiptNumber}/print`,
        grandTotal,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[POS][POST /orders] failed', err)
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
