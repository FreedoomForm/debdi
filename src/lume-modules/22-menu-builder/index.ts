/** Module 22: Menu Builder (recipes & today's menu) */
export type MenuItem = {
  id: string
  dishId: string
  name: string
  category: string
  price: number
  available: boolean
  imageUrl?: string
  description?: string
  allergens?: string[]
  calories?: number
}

export type DailyMenu = {
  date: string
  items: MenuItem[]
  publishedAt?: string
}

export async function fetchMenu(date: string) {
  const r = await fetch(`/api/admin/menus?date=${date}`)
  return r.json()
}

export async function fetchTodayMenu() {
  const r = await fetch('/api/customers/today-menu')
  return r.json()
}

export async function saveDailyMenu(date: string, items: MenuItem[]) {
  const r = await fetch('/api/admin/menus', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ date, items }),
  })
  return r.json()
}
