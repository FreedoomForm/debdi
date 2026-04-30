/**
 * Lume Modules — public barrel export.
 * 25 functional modules inspired by admin.lume.uz, integrated into Debdi.
 */

// Shared design tokens & helpers
export * from './_shared'

// 01 — Authentication
export * as Auth from './01-auth'
export { LumeLoginForm } from './01-auth/login-form'

// 02 — Dashboard
export * as Dashboard from './02-dashboard'
export { KpiCard } from './02-dashboard/kpi-card'
export { LumeDashboardPage } from './02-dashboard/dashboard-page'

// 03 — Layout
export * as Layout from './03-layout'
export { LumeSidebar } from './03-layout/sidebar'
export { LumeTopbar } from './03-layout/topbar'
export { LumeBreadcrumbs } from './03-layout/breadcrumbs'

// 04 — Users
export * as Users from './04-users'
export { LumeUsersTable } from './04-users/users-table'

// 05 — Roles
export * as Roles from './05-roles'
export { PermissionMatrix } from './05-roles/permission-matrix'

// 06 — Products
export * as Products from './06-products'
export { ProductsGrid } from './06-products/products-grid'

// 07 — Categories
export * as Categories from './07-categories'
export { CategoriesTree } from './07-categories/categories-tree'

// 08 — Orders
export * as Orders from './08-orders'
export { LumeOrdersTable } from './08-orders/orders-table'

// 09 — Order Detail
export * as OrderDetailModule from './09-order-detail'
export { OrderDetail } from './09-order-detail/order-detail'

// 10 — Customers
export * as Customers from './10-customers'
export { CustomersTable } from './10-customers/customers-table'

// 11 — Couriers
export * as Couriers from './11-couriers'
export { CouriersGrid } from './11-couriers/couriers-grid'

// 12 — Dispatch
export * as Dispatch from './12-dispatch'
export { DispatchBoard } from './12-dispatch/dispatch-board'

// 13 — Warehouse
export * as Warehouse from './13-warehouse'
export { WarehousePage } from './13-warehouse/warehouse-page'

// 14 — Finance
export * as Finance from './14-finance'
export { FinanceSummaryGrid } from './14-finance/finance-summary'

// 15 — Statistics
export * as Statistics from './15-statistics'
export { ChartsBlock } from './15-statistics/charts-block'

// 16 — Reports
export * as Reports from './16-reports'
export { ReportsPanel } from './16-reports/reports-panel'

// 17 — Notifications
export * as Notifications from './17-notifications'
export { NotificationsList } from './17-notifications/notifications-list'

// 18 — Chat
export * as Chat from './18-chat'
export { ChatWindow } from './18-chat/chat-window'

// 19 — Settings
export * as Settings from './19-settings'
export { SettingsForm } from './19-settings/settings-form'

// 20 — Profile
export * as Profile from './20-profile'
export { ProfileForm } from './20-profile/profile-form'

// 21 — Website Builder
export * as WebsiteBuilderModule from './21-website-builder'
export { WebsiteBuilder } from './21-website-builder/website-builder'

// 22 — Menu Builder
export * as MenuBuilderModule from './22-menu-builder'
export { MenuBuilder } from './22-menu-builder/menu-builder'

// 23 — Route Optimizer
export * as RouteOptimizerModule from './23-route-optimizer'
export { RouteOptimizer } from './23-route-optimizer/route-optimizer'

// 24 — Import / Export
export * as ImportExport from './24-import-export'
export { ImportExportPanel } from './24-import-export/import-panel'

// 25 — Audit Log
export * as AuditLog from './25-audit-log'
export { AuditList } from './25-audit-log/audit-list'
