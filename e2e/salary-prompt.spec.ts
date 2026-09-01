import { test, expect } from '@playwright/test'

// Diagnostic test — independent of whatever's already saved in your browser.
// Seeds a known state straight into localStorage (a goal with money left to save, and
// payday set to today) before the app ever loads, then checks the payday banner shows up
// on the Dashboard. If this test passes but you still don't see the banner with your own
// data, the feature logic is fine and something about your real data (payday not saved,
// or nothing left to save) is the actual cause — see the printed hints below.
//   npx playwright test -g "payday banner"
test('payday banner shows when salary day has arrived', async ({ page }) => {
  const today = new Date()
  // Two months out, so it's unambiguously still "in the future" no matter the day of month.
  const targetDate = new Date(today.getFullYear(), today.getMonth() + 2, 15).toISOString()

  await page.addInitScript(
    ({ salaryDay, targetDate }: { salaryDay: number; targetDate: string }) => {
      const state = {
        transactions: [],
        budgets: [],
        goals: [
          {
            id: 'diag-goal',
            name: 'Diagnostic goal',
            targetAmount: 1000,
            savedAmount: 0,
            targetDate,
            icon: 'other',
            createdAt: new Date().toISOString(),
          },
        ],
        categories: [],
        importantDates: [],
        reminderRules: [],
        settings: { currency: 'EUR', monthlyIncome: 1000, theme: 'light', salaryDay },
      }
      localStorage.setItem('ledger_app_state_v1', JSON.stringify(state))
    },
    { salaryDay: today.getDate(), targetDate }
  )

  await page.goto('/')
  await page.screenshot({ path: 'e2e/screenshots/payday-banner-diagnostic.png', fullPage: true })
  await expect(page.getByText('Payday — set money aside?')).toBeVisible()
})
