import { test, expect } from '@playwright/test'
import { mockState } from '../src/lib/mockData'

// A new visitor now lands on the onboarding wizard (empty AppState) — seed the demo dataset so
// this test sees the normal app shell with its sidebar rail.
test.beforeEach(async ({ page }) => {
  await page.addInitScript((state) => {
    localStorage.setItem('ledger_app_state_v1', JSON.stringify(state))
  }, mockState())
})

// Sidebar.tsx replaced the old 4-tabs-plus-"More"-sheet mobile pattern with a single slim
// icon-only rail used at every screen size (a vertical rail scales with height, not width, so
// all 9 sections fit directly even at 375px wide — no "More" sheet needed any more). This test
// checks that all 9 sections are directly reachable at a phone-width viewport, with no hidden
// item and no sheet to open first.
test.use({ viewport: { width: 375, height: 812 } })

test('mobile icon rail exposes all sections directly, with no hidden "More" step', async ({ page }) => {
  await page.goto('/')

  for (const tab of [
    'Dashboard',
    'Transactions',
    'Reports',
    'Budgets',
    'Goals',
    'Important Dates',
    'Calendar',
    'Notifications',
    'Settings',
  ]) {
    await expect(page.getByRole('button', { name: tab })).toBeVisible()
  }

  await page.getByRole('button', { name: 'Goals' }).click()
  await expect(page.getByRole('heading', { name: 'Goals' })).toBeVisible()
})
