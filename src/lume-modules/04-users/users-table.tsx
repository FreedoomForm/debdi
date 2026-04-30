'use client'
import { useEffect, useState } from 'react'
import { Search, Plus, MoreHorizontal } from 'lucide-react'
import { listUsers, type LumeUser } from './index'
import { formatDate } from '../_shared'

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'bg-rose-50 text-rose-700 ring-rose-200',
  MIDDLE_ADMIN: 'bg-violet-50 text-violet-700 ring-violet-200',
  LOW_ADMIN: 'bg-blue-50 text-blue-700 ring-blue-200',
  COURIER: 'bg-amber-50 text-amber-700 ring-amber-200',
  CLIENT: 'bg-slate-50 text-slate-700 ring-slate-200',
}

export function LumeUsersTable() {
  const [users, setUsers] = useState<LumeUser[]>([])
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    listUsers({ search, role }).then((d) => setUsers(d.items || d || [])).finally(() => setLoading(false))
  }, [search, role])

  return (
    <div className="space-y-4 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Пользователи</h1>
          <p className="text-sm text-slate-500">Управление сотрудниками и их доступом</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Новый пользователь
        </button>
      </header>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, email, телефону…"
            className="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
        >
          <option value="all">Все роли</option>
          <option value="SUPER_ADMIN">Супер-админ</option>
          <option value="MIDDLE_ADMIN">Менеджер</option>
          <option value="LOW_ADMIN">Сотрудник</option>
          <option value="COURIER">Курьер</option>
          <option value="CLIENT">Клиент</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3 font-semibold">Пользователь</th>
              <th className="text-left px-5 py-3 font-semibold">Email</th>
              <th className="text-left px-5 py-3 font-semibold">Телефон</th>
              <th className="text-left px-5 py-3 font-semibold">Роль</th>
              <th className="text-left px-5 py-3 font-semibold">Создан</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400">Загрузка…</td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400">Ничего не найдено</td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-sky-400 grid place-items-center text-white text-sm font-semibold">
                      {(u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '')}
                    </div>
                    <div>
                      <div className="font-medium">{u.firstName} {u.lastName}</div>
                      <div className="text-xs text-slate-500">#{u.id?.slice(0, 8)}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-700">{u.email}</td>
                <td className="px-5 py-3 text-slate-700">{u.phone}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${ROLE_BADGE[u.role] ?? ROLE_BADGE.CLIENT}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-5 py-3 text-slate-600">{u.createdAt ? formatDate(u.createdAt) : '—'}</td>
                <td className="px-5 py-3">
                  <button className="p-1.5 rounded-md hover:bg-slate-100">
                    <MoreHorizontal className="h-4 w-4 text-slate-500" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
