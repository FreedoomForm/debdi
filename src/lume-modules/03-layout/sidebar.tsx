'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import { LUME_NAV } from './index'

export function LumeSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-40 bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ${
        collapsed ? 'w-[76px]' : 'w-[260px]'
      }`}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-sky-500 grid place-items-center text-white font-bold">
            L
          </div>
          {!collapsed && <span className="font-bold text-lg tracking-tight">Lume Admin</span>}
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
          aria-label="Свернуть меню"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {LUME_NAV.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const active = pathname?.startsWith(item.href)
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-blue-600" />
                    )}
                    <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-blue-600' : ''}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && item.badge ? (
                      <span className="ml-auto rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t">
        <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition">
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Выйти</span>}
        </button>
      </div>
    </aside>
  )
}
