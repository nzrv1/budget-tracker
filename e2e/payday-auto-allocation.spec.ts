import { test, expect } from '@playwright/test'

// Regression test for the bug reported after the mobile-adaptation pass: applying the payday
// banner (or the "add funds" quick-action on a Goal/Important Date card) used to only bump
// goal.savedAmount, never logging an actual transaction. That meant the same money stayed
// counted as "still spendable" in Total balance AND as "already saved" in the goal — this month's
// spending never moved. allocateToGoal/allocateToImportantDate (App.tsx) now log a real
// 'Savings'-category expense alongside the savedAmount bump, so this test checks both halves:
// the balance actually drops, and a real transaction shows up to explain why.
function toNumber(formatted: string): number {
  return parseFloat(formatted.replace(/[^0-9.-]/g, ''))
}

test('applying the payday banner deducts the allocation from balance and logs a Savings transaction', async ({ page }) => {
  const today = new Date()
  // Two months out, so it's unambiguously still "in the future" no matter the day of month —
  // same trick salary-prompt.spec.ts uses so the goal has a nonzero this-month contribution.
  const targetDate = new Date(today.getFullYear(), today.getMonth() + 2, 15).toISOString()

  await page.addInitScript(
    ({ salaryDay, targetDate }: { salaryDay: number; targetDate: string }) => {
      const state = {
        transactions: [
          {
            id: 'seed-income',
            type: 'income',
            category: 'Salary',
            amount: 2000,
            date: new Date().toISOString().slice(0, 10),
            note: 'Seed income',
          },
        ],
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
  await expect(page.getByText('Payday — set money aside?')).toBeVisible()

  const balanceValue = () => page.locator('p', { hasText: 'Total balance' }).locator('xpath=following-sibling::p[1]')
  const balanceBefore = toNumber(await balanceValue().innerText())

  await page.getByRole('button', { name: 'Set it aside' }).click()
  await expect(page.getByText('Payday — set money aside?')).not.toBeVisible()

  // The core bug: balance must actually drop by the allocated amount, not stay frozen.
  const balanceAfter = toNumber(await balanceValue().innerText())
  expect(balanceAfter).toBeLessThan(balanceBefore)

  // The goal's own progress should also reflect the allocation (only one goal card exists in
  // this seeded state, so its saved-amount figure is the only span with this exact class set).
  await page.getByRole('button', { name: 'Goals' }).click()
  await expect(page.getByText('Diagnostic goal')).toBeVisible()
  const savedAmountText = await page.locator('span.font-tabular.font-semibold.text-lg.text-ink').first().innerText()
  expect(toNumber(savedAmountText)).toBeGreaterThan(0)

  // And it must be a real, visible transaction — not just a number that moved silently.
  await page.getByRole('button', { name: 'Transactions' }).click()
  await expect(page.getByText('Set aside for "Diagnostic goal"')).toBeVisible()
})
