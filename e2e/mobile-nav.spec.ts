import { test, expect } from '@playwright/test'
import { mockState } from '../src/lib/mockData'

// A new visitor lands on the onboarding wizard (empty AppState) — seed the demo dataset so the
// normal app shell renders.
test.beforeEach(async ({ page }) => {
  await page.addInitScript((state) => {
    localStorage.setItem('ledger_app_state_v1', JSON.stringify(state))
  }, mockState())
})

// On a phone (`< lg`) the desktop icon rail is hidden and navigation is one bottom tab bar with
// all seven content sections. Notifications and Settings are reached from the Dashboard header.
const BAR_TABS = ['Dashboard', 'Transactions', 'Budgets', 'Goals', 'Calendar', 'Reports', 'Important Dates']

test.describe('phone width', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('the bottom tab bar holds all seven sections', async ({ page }) => {
    await page.goto('/')
    for (const tab of BAR_TABS) {
      await expect(page.getByRole('button', { name: tab, exact: true })).toBeVisible()
    }
  })

  test('Notifications and Settings are not in the bar', async ({ page }) => {
    await page.goto('/')
    for (const hidden of ['Notifications', 'Settings']) {
      // The Dashboard header links are "Open notifications" / "Open settings", so the bare names
      // should not resolve to a visible control.
      await expect(page.getByRole('button', { name: hidden, exact: true })).toHaveCount(0)
    }
  })

  test('the Dashboard header reaches Notifications and Settings', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Open settings' }).click()
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await page.getByRole('button', { name: 'Dashboard', exact: true }).click()
    await page.getByRole('button', { name: 'Open notifications' }).click()
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  })

  test('tapping a tab switches the screen', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Reports', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()
  })

  test('no horizontal scroll on any screen', async ({ page }) => {
    await page.goto('/')
    for (const tab of BAR_TABS) {
      await page.getByRole('button', { name: tab, exact: true }).click()
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      )
      expect(overflow, `${tab} should not scroll sideways`).toBeLessThanOrEqual(0)
    }
  })
})

test.describe('desktop width', () => {
  test('the icon rail exposes all nine sections directly', async ({ page }) => {
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
      await expect(page.getByRole('button', { name: tab, exact: true })).toBeVisible()
    }
  })
})
