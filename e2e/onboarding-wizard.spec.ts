import { test, expect } from '@playwright/test'

// The first-run setup wizard (src/components/OnboardingWizard.tsx). A fresh visitor lands on an
// empty AppState, so the wizard opens automatically — this test walks all four question steps
// with real data (two entries each on the birthday and goal steps, to exercise the unlimited
// "add another"), then asserts the records actually landed in the Budgets / Goals / Important
// Dates screens — the same "check both halves, don't trust a number that moved" approach as
// payday-auto-allocation.spec.ts.

test('the setup wizard creates real budgets, important dates and goals', async ({ page }) => {
  await page.goto('/')

  // Step 1 — recurring monthly: pick one preset.
  await expect(page.getByText('What do you spend on every month?')).toBeVisible()
  await page.getByRole('button', { name: 'Rent', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Rent', exact: true })).toBeDisabled() // flips to the "added" state
  await page.getByRole('button', { name: /^Next/ }).click()

  // Step 2 — recurring rare: pick one preset (created as a yearly budget).
  await expect(page.getByText('And what comes up rarely, but regularly?')).toBeVisible()
  await page.getByRole('button', { name: 'Insurance', exact: true }).click()
  await page.getByRole('button', { name: /^Next/ }).click()

  // Step 3 — birthdays: add two, to prove the "add another" repeat has no limit.
  await expect(page.getByText("Birthdays you don't want to forget?")).toBeVisible()
  await addEntry(page, { text: 'Mom', date: '1990-05-20', number: '50' })
  await addEntry(page, { text: 'Dad', date: '1988-11-03', number: '40' })
  await expect(page.getByRole('listitem').filter({ hasText: 'Mom' })).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'Dad' })).toBeVisible()
  await page.getByRole('button', { name: /^Next/ }).click()

  // Step 4 — goals: add two.
  await expect(page.getByText('Big purchases or goals this year?')).toBeVisible()
  await addEntry(page, { text: 'Laptop', number: '1500', date: '2027-01-15' })
  await addEntry(page, { text: 'Camera', number: '900', date: '2027-06-01' })
  await page.getByRole('button', { name: 'Done' }).click()

  // Step 5 — summary reflects everything that was created.
  await expect(page.getByText('Budgets: 2')).toBeVisible()
  await expect(page.getByText('Important dates: 2')).toBeVisible()
  await expect(page.getByText('Goals: 2')).toBeVisible()
  await page.getByRole('button', { name: 'Go to the app' }).click()

  // The wizard is gone and does not come back on the empty-ish app.
  await expect(page.getByText('What do you spend on every month?')).toHaveCount(0)

  // Budgets screen: both budgets are really there.
  await page.getByRole('button', { name: 'Budgets' }).click()
  await expect(page.getByRole('heading', { name: 'Rent', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Insurance', exact: true })).toBeVisible()
  // Insurance was created as a yearly budget — its card carries a "Yearly" period pill.
  await expect(page.getByRole('button', { name: /Insurance/ }).getByText('Yearly')).toBeVisible()

  // Important Dates screen: both birthdays.
  await page.getByRole('button', { name: 'Important Dates' }).click()
  await expect(page.getByRole('heading', { name: 'Mom', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Dad', exact: true })).toBeVisible()

  // Goals screen: both goals.
  await page.getByRole('button', { name: 'Goals' }).click()
  await expect(page.getByRole('heading', { name: 'Laptop', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Camera', exact: true })).toBeVisible()
})

// Fills the one entry form on the current wizard step (one input per type) and submits it. The
// submit button is "Add" for the first entry and "Add another" afterwards, so target it by type
// rather than label.
async function addEntry(
  page: import('@playwright/test').Page,
  values: { text: string; number: string; date?: string }
) {
  const form = page.locator('form')
  await form.locator('input[type="text"]').fill(values.text)
  await form.locator('input[type="number"]').fill(values.number)
  if (values.date) await form.locator('input[type="date"]').fill(values.date)
  await form.locator('button[type="submit"]').click()
}
