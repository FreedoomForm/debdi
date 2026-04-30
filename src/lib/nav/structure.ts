/**
 * Unified hierarchical navigation tree for the entire system.
 *
 * 10 top-level tabs × up to 10 sub-items each = consistent two-level menu
 * across admin, POS, and operations. Used by:
 *   • src/components/layout/UnifiedSidebar.tsx
 *   • src/app/(unified)/layout.tsx
 *   • mobile bottom-bar
 *   • command palette (Cmd+K) search
 *
 * Each top-level tab has:
 *   - id: stable identifier
 *   - label, icon, description
 *   - color: Tailwind accent for the tab pill
 *   - children: sub-buttons that show in the second-level rail
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
  Tag,
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
  Database,
  MessageSquare,
  Globe,
  CreditCard,
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
      { id: 'reports-sales', href: '/pos/reports', label: 'Отчёты продаж', icon: BarChart3, desc: 'Выручка, чеки, тренды' },
      { id: 'live-status', href: '/pos/dashboard?focus=live', label: 'Лайв-статус', icon: TrendingUp, desc: 'Что происходит сейчас', badge: 'live' },
      { id: 'history', href: '/middle-admin?tab=history', label: 'Журнал действий', icon: History, desc: 'Аудит-лог' },
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
      { id: 'payments-mix', href: '/pos/reports?focus=payments', label: 'Способы оплаты', icon: CreditCard, desc: 'Касса/карта/перевод' },
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
      { id: 'cooking', href: '/pos/warehouse?tab=cooking', label: 'План готовки', icon: ChefHat, desc: 'Дневной план блюд' },
      { id: 'menu-sets', href: '/pos/warehouse?tab=sets', label: 'Меню-сеты', icon: Layers, desc: 'Калорийные группы' },
      { id: 'dishes', href: '/pos/warehouse?tab=dishes', label: 'Блюда', icon: Utensils, desc: 'Рецепты, ингредиенты' },
      { id: 'cooking-legacy', href: '/middle-admin?tab=warehouse&sub=cooking', label: 'План (старая)', icon: ChefHat, desc: 'Легаси-вид' },
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
      { id: 'warehouse', href: '/pos/warehouse', label: 'Склад продуктов', icon: Boxes, desc: 'Сырьё для блюд', badge: 'new' },
      { id: 'warehouse-legacy', href: '/middle-admin?tab=warehouse', label: 'Склад (старая)', icon: Boxes, desc: 'Легаси-вид' },
      { id: 'suppliers', href: '/pos/suppliers', label: 'Поставщики', icon: Truck, desc: 'Контакты' },
      { id: 'purchase-orders', href: '/pos/suppliers?tab=po', label: 'Закупки', icon: Tag, desc: 'Заказы поставщикам' },
    ],
  },
  // ─── 6. CRM / Customers / Loyalty ───────────────────────────────────────
  {
    id: 'crm',
    href: '/middle-admin?tab=clients',
    label: 'Клиенты',
    icon: Users,
    desc: 'CRM, лояльность, чат',
    color: 'cyan',
    children: [
      { id: 'clients', href: '/middle-admin?tab=clients', label: 'База клиентов', icon: Users, desc: 'Профили + история' },
      { id: 'loyalty', href: '/pos/loyalty', label: 'Лояльность', icon: Award, desc: 'Баллы и уровни' },
      { id: 'chat', href: '/middle-admin?tab=chat', label: 'Чат', icon: MessageSquare, desc: 'Внутренний мессенджер' },
      { id: 'website', href: '/middle-admin?tab=interface&sub=site', label: 'Сайт-витрина', icon: Globe, desc: 'Поддомен и контент' },
    ],
  },
  // ─── 7. Delivery / Couriers / Routes ────────────────────────────────────
  {
    id: 'delivery',
    href: '/middle-admin?tab=orders',
    label: 'Доставка',
    icon: Truck,
    desc: 'Курьеры, маршруты, карта',
    color: 'indigo',
    children: [
      { id: 'orders-delivery', href: '/middle-admin?tab=orders', label: 'Заказы доставки', icon: Receipt, desc: 'Активные доставки' },
      { id: 'couriers', href: '/middle-admin?tab=admins&role=COURIER', label: 'Курьеры', icon: Truck, desc: 'Список и статус' },
      { id: 'live-map', href: '/middle-admin?tab=orders&sub=map', label: 'Live-карта', icon: MapPin, desc: 'Курьеры в реальном времени', badge: 'live' },
      { id: 'route-optimize', href: '/middle-admin?tab=orders&sub=optimize', label: 'Оптимизация маршрутов', icon: TrendingUp, desc: 'ORS-планирование' },
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
      { id: 'finance-new', href: '/pos/finance', label: 'Финансы (новая)', icon: Wallet, desc: 'KPI, фильтры, экспорт', badge: 'new' },
      { id: 'finance-overview', href: '/middle-admin?tab=finance', label: 'Сводка (старая)', icon: Wallet, desc: 'Доходы и расходы' },
      { id: 'cash-drawer', href: '/pos/shift', label: 'Кассовый ящик', icon: CreditCard, desc: 'Внесения и изъятия' },
      { id: 'salary', href: '/middle-admin?tab=finance&sub=salary', label: 'Зарплата', icon: Wallet, desc: 'Выплаты сотрудникам' },
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
      { id: 'admins', href: '/middle-admin?tab=admins', label: 'Управление', icon: ShieldCheck, desc: 'Создание / блокировка' },
      { id: 'timeclock', href: '/pos/timeclock', label: 'Тайм-трекер', icon: Timer, desc: 'Учёт смен' },
      { id: 'roles', href: '/pos/employees?focus=roles', label: 'Роли и доступ', icon: ShieldCheck, desc: 'Допуски к вкладкам' },
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
      { id: 'database', href: '/middle-admin/database', label: 'База данных', icon: Database, desc: 'Импорт / экспорт', rolesAllowed: ['SUPER_ADMIN', 'MIDDLE_ADMIN'] },
      { id: 'interface', href: '/middle-admin?tab=interface', label: 'Интерфейс', icon: Settings, desc: 'Темы, языки, доступы' },
    ],
  },
]

/** Find the active section + child for the current pathname. */
export function findActiveNav(pathname: string, search: string = ''): {
  section?: NavSection
  child?: NavItem
} {
  const fullPath = `${pathname}${search}`
  // Sort by href length so we match the most specific item first.
  const all: Array<{ section: NavSection; item: NavItem }> = []
  for (const s of NAV) {
    for (const c of s.children) all.push({ section: s, item: c })
  }
  // Try exact match including search params
  const exact = all.find((x) => x.item.href === fullPath)
  if (exact) return { section: exact.section, child: exact.item }
  // Try pathname-only match
  const pathOnly = all.find((x) => x.item.href.split('?')[0] === pathname)
  if (pathOnly) return { section: pathOnly.section, child: pathOnly.item }
  // Try section root
  const section = NAV.find((s) => pathname.startsWith(s.href.split('?')[0]))
  if (section) return { section }
  return {}
}
