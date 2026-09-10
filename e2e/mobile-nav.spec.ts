import { test, expect } from '@playwright/test'
import { mockState } from '../src/lib/mockData'

// A new visitor lands on the onboarding wizard (empty AppState) — seed the demo dataset so the
// normal app shell renders.
test.beforeEach(async ({ page }) => {
  await page.addInitScript((state) => {
    localStorage.setItem('ledger_app_state_v1', JSON.stringify(state))
  }, mockState())
})

// On a phone (`< lg`) the desktop icon rail is hidden and navigation moves to a bottom tab bar:
// five primary tabs plus a "More" sheet for Reports / Important Dates / Notifications / Settings.
test.describe('phone width', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('bottom tab bar shows the five primary sections', async ({ page }) => {
    await page.goto('/')
    for (const tab of ['Dashboard', 'Transactions', 'Budgets', 'Goals', 'Calendar']) {
      await expect(page.getByRole('button', { name: tab })).toBeVisible()
    }
    // The overflow sections are not in the bar.
    for (const hidden of ['Reports', 'Important Dates', 'Notifications', 'Settings']) {
      await expect(page.getByRole('button', { name: hidden })).toHaveCount(0)
    }
  })

  test('the "More" sheet reaches the remaining sections', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'More' }).click()
    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  })

  test('tapping a primary tab switches the screen', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Goals' }).click()
    await expect(page.getByRole('heading', { name: 'Goals' })).toBeVisible()
  })

  test('no horizontal scroll on any screen', async ({ page }) => {
    await page.goto('/')
    const screens = ['Dashboard', 'Transactions', 'Budgets', 'Goals', 'Calendar']
    for (const tab of screens) {
      await page.getByRole('button', { name: tab }).click()
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
      await expect(page.getByRole('button', { name: tab })).toBeVisible()
    }
  })
})
