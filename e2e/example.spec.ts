import { test, expect } from '@playwright/test'

// Basic smoke test: the app loads and renders something.
// Use this as a template for UI-change checks as you develop —
// `npx playwright codegen http://localhost:5173` can generate the
// selectors/interactions for you.
test('app loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('body')).toBeVisible()
})

// One screenshot per sidebar tab. Screenshots land in
// e2e/screenshots/<tab>.png (gitignored).
//
// To screenshot just ONE tab instead of all of them, run e.g.:
//   npx playwright test -g "reports tab"
const TABS = ['Dashboard', 'Transactions', 'Reports', 'Budgets', 'Goals', 'Important Dates', 'Calendar', 'Notifications', 'Settings']

for (const tab of TABS) {
  const slug = tab.toLowerCase().replace(/\s+/g, '-')
  test(`${slug} tab screenshot`, async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: tab }).click()
    await page.screenshot({ path: `e2e/screenshots/${slug}.png`, fullPage: true })
  })
}

// Calendar has a Monthly/Weekly toggle — the generic loop above only captures the
// default Monthly view, so grab Weekly separately.
//   npx playwright test -g "calendar weekly"
test('calendar weekly tab screenshot', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Calendar' }).click()
  await page.getByRole('button', { name: 'Weekly' }).click()
  await page.screenshot({ path: `e2e/screenshots/calendar-weekly.png`, fullPage: true })
})
