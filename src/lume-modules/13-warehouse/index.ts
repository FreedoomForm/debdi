/** Module 13: Warehouse / Inventory */
export type Ingredient = {
  id: string
  name: string
  unit: 'kg' | 'g' | 'l' | 'ml' | 'pcs'
  stock: number
  lowStockThreshold: number
  costPerUnit: number
  supplier?: string
}

export type Dish = {
  id: string
  name: string
  recipe: { ingredientId: string; qty: number }[]
  costPerPortion: number
  active: boolean
}

export type CookingPlan = {
  id: string
  date: string
  dishes: { dishId: string; portions: number; cooked: number }[]
  status: 'planned' | 'in-progress' | 'completed'
}

export async function listIngredients() {
  const r = await fetch('/api/admin/warehouse/ingredients')
  return r.json()
}

export async function listDishes() {
  const r = await fetch('/api/admin/warehouse/dishes')
  return r.json()
}

export async function fetchInventory() {
  const r = await fetch('/api/admin/warehouse/inventory')
  return r.json()
}

export async function fetchCookingPlan(date: string) {
  const r = await fetch(`/api/admin/warehouse/cooking-plan?date=${date}`)
  return r.json()
}
