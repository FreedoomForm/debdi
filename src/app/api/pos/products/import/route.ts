import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePosAuth, badRequest, serverError } from '@/lib/pos/auth'

/**
 * POST /api/pos/products/import
 *
 * Bulk-import products from CSV-style JSON. Each row may include `categoryName`
 * which is auto-resolved (and created on the fly) before the product insert.
 *
 * Body: { rows: Array<{ name, sellPrice, sku?, barcode?, categoryName?, ... }> }
 */
const rowSchema = z.object({
  name: z.string().min(1),
  sku: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  categoryName: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  costPrice: z.number().nullable().optional(),
  sellPrice: z.number().nonnegative(),
  taxRate: z.number().min(0).max(1).default(0),
  trackStock: z.boolean().default(true),
  stockOnHand: z.number().default(0),
  reorderLevel: z.number().nullable().optional(),
  unit: z.string().default('pcs'),
  imageUrl: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
})

const bodySchema = z.object({
  rows: z.array(rowSchema).min(1).max(2000),
})

export async function POST(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) return badRequest(parsed.error.message)

  const created: number[] = []
  const errors: Array<{ row: number; error: string }> = []
  const categoryCache = new Map<string, string>()

  try {
    for (let i = 0; i < parsed.data.rows.length; i++) {
      const row = parsed.data.rows[i]
      try {
        let categoryId: string | null = null
        if (row.categoryName) {
          const key = row.categoryName.trim().toLowerCase()
          if (!categoryCache.has(key)) {
            const existing = await db.productCategory.findFirst({
              where: {
                ownerAdminId: ctx.ownerAdminId,
                name: { equals: row.categoryName.trim(), mode: 'insensitive' },
              },
            })
            if (existing) {
              categoryCache.set(key, existing.id)
            } else {
              const created = await db.productCategory.create({
                data: {
                  ownerAdminId: ctx.ownerAdminId,
                  name: row.categoryName.trim(),
                },
              })
              categoryCache.set(key, created.id)
            }
          }
          categoryId = categoryCache.get(key)!
        }

        await db.product.create({
          data: {
            ownerAdminId: ctx.ownerAdminId,
            name: row.name.trim(),
            sku: row.sku || null,
            barcode: row.barcode || null,
            description: row.description || null,
            categoryId,
            costPrice: row.costPrice ?? null,
            sellPrice: row.sellPrice,
            taxRate: row.taxRate,
            trackStock: row.trackStock,
            stockOnHand: row.stockOnHand,
            reorderLevel: row.reorderLevel ?? null,
            unit: row.unit,
            imageUrl: row.imageUrl || null,
            color: row.color || null,
          },
        })
        created.push(i)
      } catch (err) {
        errors.push({
          row: i,
          error: err instanceof Error ? err.message : 'unknown',
        })
      }
    }

    return NextResponse.json({
      ok: true,
      created: created.length,
      failed: errors.length,
      errors,
    })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
