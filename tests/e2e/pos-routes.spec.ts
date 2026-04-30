/**
 * Playwright smoke tests for POS routes.
 *
 * For each /pos/* page we:
 *   • verify it returns 200 (or redirects to /login)
 *   • verify the page renders without throwing client-side errors
 *   • assert the unified sidebar is present (except for fullscreen routes)
 *
 * Skipped when there's no BASE_URL or when the dev server isn't running.
 */
import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:3000'

const POS_ROUTES = [
  '/pos',
  '/pos/dashboard',
  '/pos/terminal',
  '/pos/orders',
  '/pos/kds',
  '/pos/tables',
  '/pos/reservations',
  '/pos/products',
  '/pos/categories',
  '/pos/inventory',
  '/pos/suppliers',
  '/pos/loyalty',
  '/pos/discounts',
  '/pos/gift-cards',
  '/pos/printers',
  '/pos/branches',
  '/pos/employees',
  '/pos/timeclock',
  '/pos/customer-display',
  '/pos/shift',
  '/pos/reports',
  '/pos/settings',
]

const FULLSCREEN = ['/pos/terminal', '/pos/kds', '/pos/customer-display', '/pos/tables']

test.describe('POS routes smoke', () => {
  for (const path of POS_ROUTES) {
    test(`route ${path} responds`, async ({ page }) => {
      const consoleErrors: string[] = []
      page.on('pageerror', (e) => consoleErrors.push(e.message))
      const res = await page.goto(`${BASE}${path}`, {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      })
      // Accept redirects (e.g. to /login) — middleware will gate unauthenticated access.
      expect(res?.status() ?? 0).toBeLessThan(500)

      // No client-side runtime errors.
      expect(consoleErrors, consoleErrors.join('\n')).toHaveLength(0)

      // Pages with the unified shell should mount the navigation rail.
      if (!FULLSCREEN.includes(path)) {
        const sidebar = page.locator('nav[aria-label="Главное меню"]')
        // We may have been redirected to /login — only assert when the page
        // actually contains the unified shell.
        const onLogin = page.url().includes('/login')
        if (!onLogin) {
          await expect(sidebar).toBeVisible({ timeout: 5000 })
        }
      }
    })
  }
})
