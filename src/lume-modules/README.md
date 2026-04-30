# Lume Modules — 25 functional parts

This directory contains 25 self-contained functional modules that mirror the
admin.lume.uz administration system, adapted to the existing `debdi` Next.js +
Prisma + NextAuth stack.

Each module ships with:

- `index.ts` — types, validation schemas (Zod), and API client functions that
  hit the existing Next.js API routes already present under
  `src/app/api/admin/*`.
- Optional `.tsx` UI components for tables, forms, cards, etc., styled with
  Tailwind CSS and `lucide-react` icons in the visual language of
  admin.lume.uz (slate neutrals, blue/sky primary, rounded-xl surfaces, soft
  shadows).

## Module index

| # | Module | Description |
|---|---|---|
| 01 | `01-auth` | Authentication & login with Zod validation, remember-me, redirect helpers. |
| 02 | `02-dashboard` | Main dashboard with KPI cards, charts, activity feed. |
| 03 | `03-layout` | Sidebar navigation, top bar with user menu / search / notifications, breadcrumbs. |
| 04 | `04-users` | Users management table, role badges, bulk actions, status toggle. |
| 05 | `05-roles` | RBAC permission matrix (15 modules × 5 actions). |
| 06 | `06-products` | Product catalog with filtering, variants, image upload, status. |
| 07 | `07-categories` | Category tree builder. |
| 08 | `08-orders` | Orders table with status pipeline, bulk update, filters. |
| 09 | `09-order-detail` | Order detail timeline, summary calculator. |
| 10 | `10-customers` | Customer list, segments, plans, bulk update. |
| 11 | `11-couriers` | Courier roster, live status, earnings. |
| 12 | `12-dispatch` | Dispatch board, ORS optimisation, start-of-day. |
| 13 | `13-warehouse` | Ingredients, dishes, recipes, cooking plan. |
| 14 | `14-finance` | Income/expense, salaries, ingredient purchases, balances. |
| 15 | `15-statistics` | Revenue / orders / top-products / courier-performance. |
| 16 | `16-reports` | CSV / XLSX / PDF report generation. |
| 17 | `17-notifications` | Notifications feed with unread state. |
| 18 | `18-chat` | Internal chat: conversations, messages, send. |
| 19 | `19-settings` | Branding, delivery, notifications, payment, language. |
| 20 | `20-profile` | Profile editing & change-password. |
| 21 | `21-website-builder` | Per-tenant subdomain site builder, AI-edit endpoint. |
| 22 | `22-menu-builder` | Daily menu publishing. |
| 23 | `23-route-optimizer` | ORS / OSRM polylines & VRP solving. |
| 24 | `24-import-export` | XLSX import (per entity & full snapshot), DB snapshot export. |
| 25 | `25-audit-log` | Action / audit log viewer & change formatter. |

## Design tokens

Shared in `_shared.ts`:

- Primary `#1d4ed8`, accent `#0ea5e9`, surface `#ffffff`, muted `#f8fafc`.
- Radius scale 8 / 12 / 16 / 22.
- Helpers: `formatMoney`, `formatDate`, `buildQueryString`, `debounce`.

## How to wire up

The modules are designed as plug-and-play utilities. To use them inside the
existing app shell:

```tsx
// example: src/app/super-admin/users/page.tsx
import { LumeUsersTable } from '@/lume-modules/04-users/users-table'
export default function Page() { return <LumeUsersTable /> }
```

```tsx
// example: src/app/super-admin/layout.tsx
import { LumeSidebar } from '@/lume-modules/03-layout/sidebar'
import { LumeTopbar } from '@/lume-modules/03-layout/topbar'
import { LumeBreadcrumbs } from '@/lume-modules/03-layout/breadcrumbs'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <LumeSidebar />
      <div className="ml-[260px]">
        <LumeTopbar />
        <LumeBreadcrumbs />
        <main>{children}</main>
      </div>
    </div>
  )
}
```

API client functions in each module call existing endpoints under
`/api/admin/*`. Where an endpoint does not yet exist (e.g. `/api/admin/notifications`),
it is intentionally left as a forward contract — back-end implementation is a
straightforward follow-up.
