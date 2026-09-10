import { test, expect } from '@playwright/test'
import { mockState } from '../src/lib/mockData'

// The acceptance test for the mobile redesign (stages 17.1–17.6): with a realistic dataset,
// no screen scrolls sideways at a phone width. This is what silently regressed the whole app
// before — the desktop layout squeezed into 375px forced the document ~140px wider than the
// viewport.

test.describe('375px — nothing scrolls sideways', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test.beforeEach(async ({ page }) => {
    await page.addInitScript((state) => {
      localStorage.setItem('ledger_app_state_v1', JSON.stringify(state))
    }, mockState())
    await page.goto('/')
  })

  async function expectNoHorizontalScroll(page: import('@playwright/test').Page, where: string) {
    // Let layout settle, then scroll to the bottom too — some overflow only shows once content
    // below the fold has rendered.
    await page.waitForTimeout(150)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(50)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
    expect(overflow, `${where} overflows by ${overflow}px`).toBeLessThanOrEqual(0)
  }

  for (const tab of ['Dashboard', 'Transactions', 'Budgets', 'Goals', 'Calendar', 'Reports', 'Important Dates']) {
    test(tab, async ({ page }) => {
      await page.getByRole('button', { name: tab, exact: true }).click()
      await expectNoHorizontalScroll(page, tab)
    })
  }

  for (const [item, opener] of [
    ['Notifications', 'Open notifications'],
    ['Settings', 'Open settings'],
  ] as const) {
    test(item, async ({ page }) => {
      await page.getByRole('button', { name: opener }).click() // the Dashboard header bell / gear
      await expect(page.getByRole('heading', { name: item })).toBeVisible()
      await expectNoHorizontalScroll(page, item)
    })
  }

  test('Add transaction sheet', async ({ page }) => {
    await page.getByRole('button', { name: 'Dashboard', exact: true }).click()
    await page.getByRole('button', { name: 'Add transaction' }).click()
    await expect(page.getByRole('heading', { name: 'Add transaction' })).toBeVisible()
    await expectNoHorizontalScroll(page, 'Add transaction sheet')
  })
})
