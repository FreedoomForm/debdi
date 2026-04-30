'use client'
import { useState } from 'react'
import { ChevronRight, ChevronDown, Folder } from 'lucide-react'
import { type Category } from './index'

function Node({ node, depth = 0 }: { node: Category; depth?: number }) {
  const [open, setOpen] = useState(true)
  const hasChildren = !!node.children?.length
  return (
    <div>
      <button
        onClick={() => hasChildren && setOpen(!open)}
        style={{ paddingLeft: 12 + depth * 18 }}
        className="w-full flex items-center gap-2 py-2 hover:bg-slate-50 rounded-md text-sm"
      >
        {hasChildren ? (
          open ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        ) : (
          <span className="w-3.5" />
        )}
        <Folder className="h-4 w-4 text-blue-500" />
        <span className="font-medium">{node.name}</span>
        {node.productCount !== undefined && (
          <span className="ml-auto pr-3 text-xs text-slate-400">{node.productCount}</span>
        )}
      </button>
      {open && node.children?.map((c) => <Node key={c.id} node={c} depth={depth + 1} />)}
    </div>
  )
}

export function CategoriesTree({ tree }: { tree: Category[] }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm divide-y">
      {tree.length === 0 ? (
        <div className="p-6 text-slate-400 text-sm text-center">Категорий пока нет</div>
      ) : (
        tree.map((root) => <Node key={root.id} node={root} />)
      )}
    </div>
  )
}
