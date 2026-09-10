import { test, expect } from '@playwright/test'

// Once payday has passed, the salary is recorded as a real income transaction so the balance
// reflects that it landed — automatically, once per month (settings.autoIncomePaydays). It must
// not double-count against the Settings baseline, and must not re-fire on reload.

function toNumber(formatted: string): number {
  return parseFloat(formatted.replace(/[^0-9.-]/g, ''))
}

test('salary is auto-logged after payday, once, without double-counting', async ({ page }) => {
  const today = new Date()
  const pastPayday = Math.max(1, today.getDate() - 2) // payday already passed this month

  await page.addInitScript((payDay: number) => {
    localStorage.setItem(
      'ledger_app_state_v1',
      JSON.stringify({
        transactions: [],
        budgets: [],
        goals: [],
        categories: [],
        importantDates: [],
        reminderRules: [],
        incomeSources: [],
        readNotificationIds: [],
        settings: {
          currency: 'EUR',
          monthlyIncome: 2500,
          theme: 'light',
          language: 'en',
          salaryDay: payDay,
          onboardingDone: true,
        },
      })
    )
  }, pastPayday)

  await page.goto('/')

  // Balance now reflects the salary.
  const balance = () => page.locator('p', { hasText: 'Total balance' }).locator('xpath=following-sibling::p[1]')
  await expect(async () => {
    expect(toNumber(await balance().innerText())).toBe(2500)
  }).toPass()

  // "Income this month" is 2500, not 5000 — the Settings baseline isn't counted on top of the
  // transaction it just became.
  const incomeTile = page.locator('p', { hasText: /^Income$/ }).locator('xpath=following-sibling::p[1]')
  expect(toNumber(await incomeTile.innerText())).toBe(2500)

  // It's a real, visible transaction.
  await page.getByRole('button', { name: 'Transactions' }).click()
  await expect(page.getByText('Basic salary').first()).toBeVisible()
  await expect(page.getByText('+€2,500.00').first()).toBeVisible()

  // Reload — still exactly one.
  await page.reload()
  await page.getByRole('button', { name: 'Transactions' }).click()
  await expect(page.getByText('+€2,500.00')).toHaveCount(1)
})
