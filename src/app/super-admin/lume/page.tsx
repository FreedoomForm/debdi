import Link from 'next/link'

const MODULES = [
  { n: '01', key: 'auth', label: 'Аутентификация', desc: 'Login, JWT, redirect helpers' },
  { n: '02', key: 'dashboard', label: 'Дашборд', desc: 'KPI, активность, графики' },
  { n: '03', key: 'layout', label: 'Layout', desc: 'Sidebar, topbar, breadcrumbs' },
  { n: '04', key: 'users', label: 'Пользователи', desc: 'Сотрудники, роли, статусы' },
  { n: '05', key: 'roles', label: 'Роли и права', desc: 'RBAC матрица' },
  { n: '06', key: 'products', label: 'Продукты', desc: 'Каталог продуктов' },
  { n: '07', key: 'categories', label: 'Категории', desc: 'Дерево категорий' },
  { n: '08', key: 'orders', label: 'Заказы', desc: 'Все заказы, статусы' },
  { n: '09', key: 'order-detail', label: 'Детали заказа', desc: 'Хронология заказа' },
  { n: '10', key: 'customers', label: 'Клиенты', desc: 'База клиентов' },
  { n: '11', key: 'couriers', label: 'Курьеры', desc: 'Состав, статусы' },
  { n: '12', key: 'dispatch', label: 'Диспетчер', desc: 'Распределение и карта' },
  { n: '13', key: 'warehouse', label: 'Склад', desc: 'Ингредиенты' },
  { n: '14', key: 'finance', label: 'Финансы', desc: 'Доход и расход' },
  { n: '15', key: 'statistics', label: 'Статистика', desc: 'Графики' },
  { n: '16', key: 'reports', label: 'Отчёты', desc: 'CSV / XLSX / PDF' },
  { n: '17', key: 'notifications', label: 'Уведомления', desc: 'Лента событий' },
  { n: '18', key: 'chat', label: 'Чат', desc: 'Внутренний чат' },
  { n: '19', key: 'settings', label: 'Настройки', desc: 'Бренд, доставка' },
  { n: '20', key: 'profile', label: 'Профиль', desc: 'Личные данные' },
  { n: '21', key: 'website-builder', label: 'Сайт', desc: 'Конструктор + AI' },
  { n: '22', key: 'menu-builder', label: 'Меню', desc: 'Меню по дням' },
  { n: '23', key: 'route-optimizer', label: 'Маршруты', desc: 'Оптимизация ORS' },
  { n: '24', key: 'import-export', label: 'Импорт/Экспорт', desc: 'XLSX / Snapshot' },
  { n: '25', key: 'audit-log', label: 'Журнал', desc: 'Action log' },
]

export default function LumeIndexPage() {
  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Lume Admin · 25 модулей</h1>
        <p className="text-slate-500 mt-1">
          Полный набор административной функциональности на базе admin.lume.uz, интегрированный в Debdi.
        </p>
      </header>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MODULES.map((m) => (
          <Link
            key={m.key}
            href={`/super-admin/lume/${m.key}`}
            className="rounded-xl border bg-white p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition group"
          >
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-10 h-10 rounded-lg bg-blue-50 text-blue-700 grid place-items-center font-bold text-sm">
                {m.n}
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold truncate group-hover:text-blue-700">{m.label}</h3>
                <p className="text-xs text-slate-500 truncate">{m.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
