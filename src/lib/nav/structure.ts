/**
 * Unified hierarchical navigation tree for the entire system.
 *
 * 10 top-level tabs × up to 10 sub-items each = consistent two-level menu.
 * Used by:
 *   • src/components/layout/UnifiedSidebar.tsx
 *   • mobile bottom-bar
 *   • command palette (Cmd+K) search
 *
 * Design rules (enforced by tests/system/nav-structure.test.mjs):
 *   • Every href must point to /pos/* (no /middle-admin/* legacy links).
 *   • No two children in the same section may share base path or label.
 *   • Each top-level click only PINS the section; navigation happens
 *     exclusively through level-2 children.
 */
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  ShoppingCart,
  ChefHat,
  Utensils,
  Package,
  Users,
  TrendingUp,
  Settings,
  Wallet,
  Truck,
  // sub-icons
  BarChart3,
  Receipt,
  Layers,
  Award,
  Percent,
  Gift,
  Boxes,
  FolderTree,
  CalendarDays,
  Monitor,
  Clock,
  Timer,
  UserCog,
  ShieldCheck,
  Store,
  Printer,
  Cog,
  History,
  MapPin,
  MessageSquare,
  Globe,
  CreditCard,
  Trash2,
  ClipboardCheck,
  Bell,
} from 'lucide-react'

export type NavItem = {
  id: string
  href: string
  label: string
  icon: LucideIcon
  desc?: string
  badge?: 'live' | 'beta' | 'new'
  rolesAllowed?: Array<'SUPER_ADMIN' | 'MIDDLE_ADMIN' | 'LOW_ADMIN' | 'COURIER' | 'WORKER'>
}

export type NavSection = {
  id: string
  href: string
  label: string
  icon: LucideIcon
  desc: string
  color: string
  children: NavItem[]
}

export const NAV: NavSection[] = [
  // ─── 1. Operations / Dashboard ──────────────────────────────────────────
  {
    id: 'dashboard',
    href: '/pos/dashboard',
    label: 'Обзор',
    icon: LayoutDashboard,
    desc: 'KPI, активность, тренды',
    color: 'amber',
    children: [
      { id: 'overview', href: '/pos/dashboard', label: 'Дашборд', icon: LayoutDashboard, desc: 'Общая сводка дня' },
      { id: 'live-status', href: '/pos/dashboard?focus=live', label: 'Лайв-статус', icon: TrendingUp, desc: 'Что происходит сейчас', badge: 'live' },
      { id: 'statistics', href: '/pos/statistics', label: 'Статистика', icon: BarChart3, desc: 'KPI, статусы, калории' },
      { id: 'reports', href: '/pos/reports', label: 'Отчёты продаж', icon: BarChart3, desc: 'Выручка, чеки, тренды' },
      { id: 'history', href: '/pos/history', label: 'Журнал действий', icon: History, desc: 'Аудит-лог, фильтры' },
      { id: 'notifications', href: '/pos/notifications', label: 'Уведомления', icon: Bell, desc: 'Inbox событий', badge: 'new' },
    ],
  },
  // ─── 2. Sales / POS Terminal ────────────────────────────────────────────
  {
    id: 'sales',
    href: '/pos/terminal',
    label: 'Продажи',
    icon: ShoppingCart,
    desc: 'Касса, смены, чеки',
    color: 'orange',
    children: [
      { id: 'terminal', href: '/pos/terminal', label: 'Терминал', icon: ShoppingCart, desc: 'Кассовый интерфейс' },
      { id: 'orders', href: '/pos/orders', label: 'Журнал заказов', icon: Receipt, desc: 'История + возвраты' },
      { id: 'shift', href: '/pos/shift', label: 'Смена', icon: Clock, desc: 'Открыть / закрыть кассу' },
      { id: 'customer-display', href: '/pos/customer-display', label: 'Экран клиента', icon: Monitor, desc: 'Второй экран' },
      { id: 'discounts', href: '/pos/discounts', label: 'Скидки и промо', icon: Percent, desc: 'Купоны, акции' },
      { id: 'gift-cards', href: '/pos/gift-cards', label: 'Подарочные карты', icon: Gift, desc: 'Выпуск и баланс' },
    ],
  },
  // ─── 3. Kitchen / KDS ───────────────────────────────────────────────────
  {
    id: 'kitchen',
    href: '/pos/kds',
    label: 'Кухня',
    icon: ChefHat,
    desc: 'Тикеты, готовка, склад блюд',
    color: 'rose',
    children: [
      { id: 'kds', href: '/pos/kds', label: 'KDS · Дисплей', icon: ChefHat, desc: 'Активные тикеты' },
      { id: 'cooking-plan', href: '/pos/warehouse?tab=cooking', label: 'План готовки', icon: ChefHat, desc: 'Дневной план блюд' },
      { id: 'menu-sets', href: '/pos/warehouse?tab=sets', label: 'Меню-сеты', icon: Layers, desc: 'Калорийные группы' },
      { id: 'dishes', href: '/pos/warehouse?tab=dishes', label: 'Блюда', icon: Utensils, desc: 'Рецепты, ингредиенты' },
    ],
  },
  // ─── 4. Tables / Reservations / Floor ───────────────────────────────────
  {
    id: 'floor',
    href: '/pos/tables',
    label: 'Зал',
    icon: Utensils,
    desc: 'Столы, резервы, подача',
    color: 'blue',
    children: [
      { id: 'floor-plan', href: '/pos/tables', label: 'Floor plan', icon: Utensils, desc: 'Карта столов' },
      { id: 'reservations', href: '/pos/reservations', label: 'Резервы', icon: CalendarDays, desc: 'Бронь столов' },
    ],
  },
  // ─── 5. Catalog / Products / Inventory ──────────────────────────────────
  {
    id: 'catalog',
    href: '/pos/products',
    label: 'Каталог',
    icon: Package,
    desc: 'Товары, склад, поставщики',
    color: 'emerald',
    children: [
      { id: 'products', href: '/pos/products', label: 'Товары', icon: Package, desc: 'SKU, цены, остатки' },
      { id: 'categories', href: '/pos/categories', label: 'Категории', icon: FolderTree, desc: 'Группы товаров' },
      { id: 'inventory', href: '/pos/inventory', label: 'Движения склада', icon: Boxes, desc: 'Аудит остатков' },
      { id: 'warehouse', href: '/pos/warehouse', label: 'Склад продуктов', icon: Boxes, desc: 'Сырьё для блюд' },
      { id: 'suppliers', href: '/pos/suppliers', label: 'Поставщики', icon: Truck, desc: 'Контакты, профили' },
      { id: 'purchase-orders', href: '/pos/purchase-orders', label: 'Заказы поставщикам', icon: Truck, desc: 'PO, приёмка, статусы', badge: 'new' },
    ],
  },
  // ─── 6. CRM / Customers / Loyalty ───────────────────────────────────────
  {
    id: 'crm',
    href: '/pos/clients',
    label: 'Клиенты',
    icon: Users,
    desc: 'CRM, лояльность, чат',
    color: 'cyan',
    children: [
      { id: 'clients', href: '/pos/clients', label: 'База клиентов', icon: Users, desc: 'CRM, KPI, фильтры' },
      { id: 'loyalty', href: '/pos/loyalty', label: 'Лояльность', icon: Award, desc: 'Баллы и уровни' },
      { id: 'chat', href: '/pos/chat', label: 'Чат', icon: MessageSquare, desc: 'Двухпанельный мессенджер' },
      { id: 'sites', href: '/pos/sites', label: 'Сайт-витрина', icon: Globe, desc: 'Поддомен, тема, контент' },
    ],
  },
  // ─── 7. Delivery / Couriers / Routes ────────────────────────────────────
  {
    id: 'delivery',
    href: '/pos/delivery',
    label: 'Доставка',
    icon: Truck,
    desc: 'Курьеры, маршруты, карта',
    color: 'indigo',
    children: [
      { id: 'orders-delivery', href: '/pos/delivery', label: 'Заказы доставки', icon: Receipt, desc: 'KPI, статус-пиплайн' },
      { id: 'couriers', href: '/pos/couriers', label: 'Курьеры', icon: Truck, desc: 'KPI, лайв-позиции, зарплата' },
      { id: 'live-map', href: '/pos/delivery/map', label: 'Live-карта', icon: MapPin, desc: 'Курьеры в реальном времени', badge: 'live' },
    ],
  },
  // ─── 8. Finance / Cash / Salary ─────────────────────────────────────────
  {
    id: 'finance',
    href: '/pos/finance',
    label: 'Финансы',
    icon: Wallet,
    desc: 'Касса, налоги, зарплата',
    color: 'lime',
    children: [
      { id: 'finance', href: '/pos/finance', label: 'Финансы', icon: Wallet, desc: 'KPI, фильтры, экспорт' },
      { id: 'cash-drawer', href: '/pos/cash-drawer', label: 'Кассовый ящик', icon: CreditCard, desc: 'Внесения и изъятия', badge: 'new' },
      { id: 'tip-pool', href: '/pos/tip-pool', label: 'Tip Pool', icon: Wallet, desc: 'Распределение чаевых', badge: 'new' },
      { id: 'tax-rates', href: '/pos/settings?focus=tax', label: 'Ставки налогов', icon: Percent, desc: 'НДС и сервисный сбор' },
      { id: 'reports-fin', href: '/pos/reports', label: 'Финансовые отчёты', icon: BarChart3, desc: 'Прибыль/убыток' },
    ],
  },
  // ─── 9. Team / Staff / Time ─────────────────────────────────────────────
  {
    id: 'team',
    href: '/pos/employees',
    label: 'Команда',
    icon: UserCog,
    desc: 'Сотрудники, роли, время',
    color: 'violet',
    children: [
      { id: 'employees', href: '/pos/employees', label: 'Сотрудники', icon: UserCog, desc: 'Роль, зарплата' },
      { id: 'admins', href: '/pos/admins', label: 'Персонал и доступы', icon: ShieldCheck, desc: 'Создание, права, KPI' },
      { id: 'timeclock', href: '/pos/timeclock', label: 'Тайм-трекер', icon: Timer, desc: 'Учёт смен' },
      { id: 'checklists', href: '/pos/checklists', label: 'Чек-листы смены', icon: ClipboardCheck, desc: 'Открытие/закрытие смены', badge: 'new' },
    ],
  },
  // ─── 10. Settings ───────────────────────────────────────────────────────
  {
    id: 'settings',
    href: '/pos/settings',
    label: 'Настройки',
    icon: Settings,
    desc: 'Принтеры, филиалы, интеграции',
    color: 'slate',
    children: [
      { id: 'pos-settings', href: '/pos/settings', label: 'Параметры POS', icon: Cog, desc: 'Валюта, налоги, чек' },
      { id: 'printers', href: '/pos/printers', label: 'Принтеры', icon: Printer, desc: 'Касса, кухня, бар' },
      { id: 'branches', href: '/pos/branches', label: 'Филиалы', icon: Store, desc: 'Мульти-локация' },
      { id: 'trash', href: '/pos/trash', label: 'Корзина', icon: Trash2, desc: 'Удалённые клиенты и заказы' },
    ],
  },
]

/** Find the active section + child for the current pathname. */
export function findActiveNav(pathname: string, search: string = ''): {
  section?: NavSection
  child?: NavItem
} {
  const fullPath = `${pathname}${search}`
  // Build a flat list once per call.
  const all: Array<{ section: NavSection; item: NavItem }> = []
  for (const s of NAV) {
    for (const c of s.children) all.push({ section: s, item: c })
  }
  // Try exact match including search params first.
  const exact = all.find((x) => x.item.href === fullPath)
  if (exact) return { section: exact.section, child: exact.item }
  // Then pathname-only match (ignoring query string).
  const pathOnly = all.find((x) => x.item.href.split('?')[0] === pathname)
  if (pathOnly) return { section: pathOnly.section, child: pathOnly.item }
  // Finally section root.
  const section = NAV.find((s) => pathname.startsWith(s.href.split('?')[0]))
  if (section) return { section }
  return {}
}
