/** Module 06: Products Catalog */
import { z } from 'zod'

export const ProductSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  compareAtPrice: z.number().nonnegative().optional(),
  stock: z.number().int().nonnegative().default(0),
  currency: z.string().default('UZS'),
  status: z.enum(['active','draft','archived']).default('active'),
  categoryId: z.string().optional(),
  images: z.array(z.object({ id: z.string(), url: z.string() })).default([]),
  variants: z.array(z.object({
    id: z.string(), name: z.string(), sku: z.string(),
    price: z.number(), stock: z.number(),
  })).default([]),
})
export type Product = z.infer<typeof ProductSchema> & { id: string; createdAt: string }

export async function listProducts(filters: Record<string, unknown>) {
  const sp = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => v !== undefined && v !== '' && sp.set(k, String(v)))
  const r = await fetch(`/api/admin/menus?${sp}`)
  return r.json()
}
