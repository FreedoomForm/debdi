/** Module 03: Sidebar Navigation & Main Layout - inspired by admin.lume.uz */
import {
  LayoutDashboard, Users, ShieldCheck, Package, FolderTree, ShoppingCart,
  UserCircle, Truck, Map, Warehouse, DollarSign, BarChart3, FileText,
  Bell, MessageSquare, Settings, User, Globe, BookOpen, Route, Upload, ScrollText,
} from 'lucide-react'

export type NavItem = {
  key: string
  label: string
  href: string
  icon: any
  badge?: number | string
  roles?: string[]
}

export type NavSection = {
  title: string
  items: NavItem[]
}

export const LUME_NAV: NavSection[] = [
  {
    title: 'Обзор',
    items: [
      { key: 'dashboard', label: 'Главная', href: '/super-admin', icon: LayoutDashboard },
      { key: 'stats', label: 'Статистика', href: '/super-admin/statistics', icon: BarChart3 },
    ],
  },
  {
    title: 'Управление',
    items: [
      { key: 'users', label: 'Пользователи', href: '/super-admin/users', icon: Users },
      { key: 'roles', label: 'Роли и права', href: '/super-admin/roles', icon: ShieldCheck },
      { key: 'customers', label: 'Клиенты', href: '/super-admin/clients', icon: UserCircle },
      { key: 'couriers', label: 'Курьеры', href: '/super-admin/couriers', icon: Truck },
    ],
  },
  {
    title: 'Каталог',
    items: [
      { key: 'products', label: 'Продукты', href: '/super-admin/products', icon: Package },
      { key: 'categories', label: 'Категории', href: '/super-admin/categories', icon: FolderTree },
      { key: 'menu-builder', label: 'Конструктор меню', href: '/super-admin/menu', icon: BookOpen },
    ],
  },
  {
    title: 'Операции',
    items: [
      { key: 'orders', label: 'Заказы', href: '/super-admin/orders', icon: ShoppingCart },
      { key: 'dispatch', label: 'Диспетчер', href: '/super-admin/dispatch', icon: Map },
      { key: 'route', label: 'Оптимизация маршрута', href: '/super-admin/route', icon: Route },
      { key: 'warehouse', label: 'Склад', href: '/super-admin/warehouse', icon: Warehouse },
    ],
  },
  {
    title: 'Финансы и отчёты',
    items: [
      { key: 'finance', label: 'Финансы', href: '/super-admin/finance', icon: DollarSign },
      { key: 'reports', label: 'Отчёты', href: '/super-admin/reports', icon: FileText },
      { key: 'import-export', label: 'Импорт/Экспорт', href: '/super-admin/import', icon: Upload },
    ],
  },
  {
    title: 'Коммуникации',
    items: [
      { key: 'notifications', label: 'Уведомления', href: '/super-admin/notifications', icon: Bell },
      { key: 'chat', label: 'Чат', href: '/super-admin/chat', icon: MessageSquare },
    ],
  },
  {
    title: 'Сайт и настройки',
    items: [
      { key: 'website', label: 'Конструктор сайта', href: '/super-admin/website', icon: Globe },
      { key: 'profile', label: 'Профиль', href: '/super-admin/profile', icon: User },
      { key: 'settings', label: 'Настройки', href: '/super-admin/settings', icon: Settings },
      { key: 'audit', label: 'Журнал действий', href: '/super-admin/audit', icon: ScrollText },
    ],
  },
]
