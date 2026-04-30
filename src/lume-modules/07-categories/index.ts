/** Module 07: Categories tree */
export type Category = {
  id: string
  name: string
  parentId?: string | null
  slug: string
  productCount?: number
  children?: Category[]
  order?: number
  active?: boolean
}

export function buildTree(flat: Category[]): Category[] {
  const map = new Map<string, Category>()
  flat.forEach((c) => map.set(c.id, { ...c, children: [] }))
  const roots: Category[] = []
  map.forEach((c) => {
    if (c.parentId && map.has(c.parentId)) map.get(c.parentId)!.children!.push(c)
    else roots.push(c)
  })
  return roots.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}
