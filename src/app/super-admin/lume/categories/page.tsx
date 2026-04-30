'use client'
import { CategoriesTree } from '@/lume-modules/07-categories/categories-tree'
import { buildTree, type Category } from '@/lume-modules/07-categories'

const SAMPLE: Category[] = [
  { id: '1', name: 'Завтраки', slug: 'breakfast', parentId: null, productCount: 12 },
  { id: '2', name: 'Обеды', slug: 'lunch', parentId: null, productCount: 24 },
  { id: '3', name: 'Каши', slug: 'porridge', parentId: '1', productCount: 6 },
  { id: '4', name: 'Омлеты', slug: 'omelet', parentId: '1', productCount: 4 },
  { id: '5', name: 'Супы', slug: 'soup', parentId: '2', productCount: 8 },
]

export default function Page() {
  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Категории</h1>
        <p className="text-sm text-slate-500">Дерево категорий каталога</p>
      </header>
      <CategoriesTree tree={buildTree(SAMPLE)} />
    </div>
  )
}
