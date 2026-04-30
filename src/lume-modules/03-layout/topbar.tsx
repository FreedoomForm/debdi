'use client'
import { Bell, Search, Sun, Moon, ChevronDown } from 'lucide-react'
import { useState } from 'react'

export function LumeTopbar() {
  const [dark, setDark] = useState(false)
  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur border-b flex items-center px-6 gap-4">
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="search"
          placeholder="Поиск по системе…"
          className="w-full h-10 pl-10 pr-4 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
        />
        <kbd className="hidden md:inline-flex absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400 bg-white border rounded px-1.5 py-0.5">
          ⌘K
        </kbd>
      </div>
      <button
        onClick={() => setDark(!dark)}
        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
        aria-label="Тема"
      >
        {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>
      <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Уведомления">
        <Bell className="h-5 w-5" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
      </button>
      <div className="w-px h-8 bg-slate-200" />
      <button className="flex items-center gap-2.5 p-1 pr-2 rounded-lg hover:bg-slate-100">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-sky-400 grid place-items-center text-white text-sm font-semibold">
          PI
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium leading-tight">Point Indev</p>
          <p className="text-xs text-slate-500">Администратор</p>
        </div>
        <ChevronDown className="hidden md:block h-4 w-4 text-slate-400" />
      </button>
    </header>
  )
}
