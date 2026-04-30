'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

const LABELS: Record<string, string> = {
  'super-admin': 'Главная',
  'middle-admin': 'Менеджер',
  'low-admin': 'Сотрудник',
  users: 'Пользователи',
  roles: 'Роли',
  products: 'Продукты',
  categories: 'Категории',
  orders: 'Заказы',
  clients: 'Клиенты',
  couriers: 'Курьеры',
  warehouse: 'Склад',
  finance: 'Финансы',
  reports: 'Отчёты',
  notifications: 'Уведомления',
  settings: 'Настройки',
  profile: 'Профиль',
  statistics: 'Статистика',
  audit: 'Журнал',
  chat: 'Чат',
  dispatch: 'Диспетчер',
  route: 'Маршрут',
  menu: 'Меню',
  website: 'Сайт',
  import: 'Импорт',
}

export function LumeBreadcrumbs() {
  const pathname = usePathname() ?? ''
  const segs = pathname.split('/').filter(Boolean)
  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm text-slate-500 px-6 py-3">
      <Link href="/" className="flex items-center gap-1.5 hover:text-slate-900">
        <Home className="w-3.5 h-3.5" />
        Дом
      </Link>
      {segs.map((s, i) => {
        const path = '/' + segs.slice(0, i + 1).join('/')
        const last = i === segs.length - 1
        const label = LABELS[s] || s.replace(/-/g, ' ')
        return (
          <span key={path} className="flex items-center">
            <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-300" />
            {last ? (
              <span className="font-medium text-slate-900 capitalize">{label}</span>
            ) : (
              <Link href={path} className="hover:text-slate-900 capitalize">{label}</Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
