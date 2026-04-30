# LUME — 25 функциональных модулей в Debdi

Этот документ описывает интеграцию 25 модулей административной системы,
вдохновлённых **admin.lume.uz**, в существующее Next.js + Prisma + NextAuth
приложение **debdi**.

## Где смотреть

- Код модулей: `src/lume-modules/<NN-name>/`
- Страницы-обёртки: `src/app/super-admin/lume/<slug>/page.tsx`
- Главная индекса: `/super-admin/lume`
- Barrel-экспорт: `src/lume-modules/index.ts`

## Архитектурные решения

1. **Изоляция** — модули размещены в одной папке, не вмешиваются в
   существующий код debdi. Каждый имеет собственный `index.ts` с типами,
   Zod-схемами и API-функциями.
2. **Совместимость API** — клиентские функции каждого модуля обращаются к
   уже существующим маршрутам `/api/admin/*`, что облегчает интеграцию с
   текущим бэкендом.
3. **Дизайн-система** — общие токены в `_shared.ts` (палитра LUME, радиусы,
   утилиты `formatMoney`, `formatDate`, `debounce`). Стили построены на
   Tailwind с нейтрально-синей палитрой LUME.
4. **Tree-shaking** — каждый компонент импортируется по своему пути, либо
   через namespaced barrel-экспорт.

## Полный список 25 модулей

| # | Модуль | Назначение |
|---|---|---|
| 01 | `01-auth` | Авторизация: Zod-схема, login-форма, redirect helper |
| 02 | `02-dashboard` | KPI-карточки, графики, активность |
| 03 | `03-layout` | Sidebar (7 групп · 25 пунктов), topbar, breadcrumbs |
| 04 | `04-users` | Управление пользователями, роли, статусы |
| 05 | `05-roles` | RBAC матрица 15 модулей × 5 действий |
| 06 | `06-products` | Каталог продуктов (grid/list view) |
| 07 | `07-categories` | Дерево категорий |
| 08 | `08-orders` | Заказы (8 статусов), фильтры, bulk |
| 09 | `09-order-detail` | Карточка заказа, хронология, итоги |
| 10 | `10-customers` | Клиенты, тарифы, статусы |
| 11 | `11-couriers` | Курьеры, online/busy/offline, рейтинг |
| 12 | `12-dispatch` | Доска диспетчера, ORS-оптимизация |
| 13 | `13-warehouse` | Склад: ингредиенты, низкие остатки |
| 14 | `14-finance` | Доходы/расходы/зарплаты/закупки |
| 15 | `15-statistics` | Серии данных по метрикам |
| 16 | `16-reports` | 7 типов × CSV/XLSX/PDF |
| 17 | `17-notifications` | Лента уведомлений |
| 18 | `18-chat` | Внутренний чат |
| 19 | `19-settings` | Настройки бренда/доставки/оплаты |
| 20 | `20-profile` | Профиль и смена пароля |
| 21 | `21-website-builder` | Конструктор сайта + AI-edit |
| 22 | `22-menu-builder` | Меню по дате |
| 23 | `23-route-optimizer` | VRP / ORS оптимизация маршрутов |
| 24 | `24-import-export` | Импорт XLSX, snapshot базы |
| 25 | `25-audit-log` | Журнал действий администраторов |

## Использование

```tsx
// Импорт по barrel:
import { LumeUsersTable, LumeOrdersTable } from '@/lume-modules'

// Или точечно:
import { LumeOrdersTable } from '@/lume-modules/08-orders/orders-table'
import { ORDER_STATUS_LABELS } from '@/lume-modules/08-orders'
```

## Дизайн-токены

| Токен | Значение |
|---|---|
| Primary | `#1d4ed8` |
| Primary soft | `#dbeafe` |
| Accent | `#0ea5e9` |
| Surface | `#ffffff` |
| Surface muted | `#f8fafc` |
| Border | `#e2e8f0` |
| Text primary | `#0f172a` |
| Text muted | `#64748b` |
| Success | `#10b981` |
| Warning | `#f59e0b` |
| Danger | `#ef4444` |
| Radius scale | 8 / 12 / 16 / 22 px |

## Адаптивность

Все таблицы и сетки адаптивны:

- **Desktop ≥1024px** — полный layout с sidebar 260px
- **Tablet 768–1023px** — компактный sidebar 76px
- **Mobile ≤767px** — drawer-меню, одноколоночные сетки
