'use client'
import { useMemo } from 'react'
import { MODULES, ACTIONS, type Permission } from './index'

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Главная', users: 'Пользователи', roles: 'Роли',
  products: 'Продукты', categories: 'Категории', orders: 'Заказы',
  customers: 'Клиенты', couriers: 'Курьеры', warehouse: 'Склад',
  finance: 'Финансы', reports: 'Отчёты', settings: 'Настройки',
  audit: 'Журнал', website: 'Сайт', dispatch: 'Диспетчер',
}

const ACTION_LABELS: Record<string, string> = {
  view: 'Просмотр', create: 'Создание', update: 'Изменение',
  delete: 'Удаление', export: 'Экспорт',
}

export function PermissionMatrix({
  value, onChange, disabled,
}: { value: Permission[]; onChange: (p: Permission[]) => void; disabled?: boolean }) {
  const set = useMemo(() => new Set(value), [value])
  const toggle = (p: Permission) => {
    const next = new Set(set)
    next.has(p) ? next.delete(p) : next.add(p)
    onChange([...next] as Permission[])
  }
  const toggleRow = (m: string, on: boolean) => {
    const next = new Set(set)
    ACTIONS.forEach((a) => {
      const p = `${m}.${a}` as Permission
      on ? next.add(p) : next.delete(p)
    })
    onChange([...next] as Permission[])
  }

  return (
    <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="px-5 py-3 bg-slate-50 border-b font-semibold">Матрица прав</div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600 text-xs">
          <tr>
            <th className="text-left px-5 py-2 font-medium">Модуль</th>
            {ACTIONS.map((a) => (
              <th key={a} className="px-3 py-2 font-medium text-center">{ACTION_LABELS[a]}</th>
            ))}
            <th className="px-3 py-2 font-medium text-center">Все</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {MODULES.map((m) => {
            const rowChecked = ACTIONS.every((a) => set.has(`${m}.${a}` as Permission))
            return (
              <tr key={m} className="hover:bg-slate-50/60">
                <td className="px-5 py-2.5 font-medium">{MODULE_LABELS[m] ?? m}</td>
                {ACTIONS.map((a) => {
                  const perm = `${m}.${a}` as Permission
                  return (
                    <td key={a} className="px-3 py-2.5 text-center">
                      <input
                        type="checkbox" checked={set.has(perm)}
                        onChange={() => toggle(perm)} disabled={disabled}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  )
                })}
                <td className="px-3 py-2.5 text-center">
                  <input
                    type="checkbox" checked={rowChecked}
                    onChange={(e) => toggleRow(m, e.target.checked)} disabled={disabled}
                    className="rounded border-slate-300 text-blue-500"
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="px-5 py-2 bg-slate-50 border-t text-xs text-slate-500">
        Выбрано: {value.length} из {MODULES.length * ACTIONS.length}
      </div>
    </div>
  )
}
