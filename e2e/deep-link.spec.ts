import { test, expect, type Page } from '@playwright/test'

// Telegram notification deep links (?startapp=…) — the Mini App reads Telegram's
// initDataUnsafe.start_param on launch and lands the user on the right screen instead of the
// dashboard. index.html loads Telegram's real SDK from their CDN, which would overwrite any fake
// window.Telegram we set; so we intercept that script and serve a stub WebApp carrying the
// start_param we want, then seed a known saved state.

async function fakeTelegram(page: Page, startParam: string) {
  await page.route('**/telegram-web-app.js', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `window.Telegram = {
        WebApp: {
          ready() {}, expand() {}, colorScheme: 'light', initData: '',
          initDataUnsafe: { start_param: ${JSON.stringify(startParam)} },
          BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} },
        },
      };`,
    }),
  )
}

const seededState = {
  transactions: [],
  budgets: [],
  goals: [
    {
      id: 'gdeeplink',
      name: 'Deep link goal',
      targetAmount: 1000,
      savedAmount: 100,
      targetDate: new Date(new Date().getFullYear() + 1, 0, 15).toISOString(),
      icon: 'other',
      createdAt: new Date().toISOString(),
    },
  ],
  categories: [],
  importantDates: [
    {
      id: 'ddeeplink',
      name: 'Deep link date',
      date: `${new Date().getFullYear() + 1}-06-01`,
      category: 'other',
      recurring: false,
      createdAt: new Date().toISOString(),
      targetAmount: 200,
      savedAmount: 20,
    },
  ],
  reminderRules: [],
  incomeSources: [],
  readNotificationIds: [],
  settings: { currency: 'EUR', monthlyIncome: 1000, theme: 'light', language: 'en' },
}

async function seed(page: Page) {
  await page.addInitScript((s) => localStorage.setItem('ledger_app_state_v1', JSON.stringify(s)), seededState)
}

test('startapp=settings opens the Settings screen', async ({ page }) => {
  await fakeTelegram(page, 'settings')
  await seed(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
})

test('startapp=allocate_goal lands on Goals with the amount prefilled', async ({ page }) => {
  await fakeTelegram(page, 'allocate_goal_gdeeplink_250')
  await seed(page)
  await page.goto('/')
  const card = page.locator('#goal-card-gdeeplink')
  await expect(card).toBeVisible()
  await expect(card.locator('input[type="number"]')).toHaveValue('250')
})

test('startapp=allocate_date lands on Important Dates with the amount prefilled', async ({ page }) => {
  await fakeTelegram(page, 'allocate_date_ddeeplink_75')
  await seed(page)
  await page.goto('/')
  const card = page.locator('#date-card-ddeeplink')
  await expect(card).toBeVisible()
  await expect(card.locator('input[type="number"]')).toHaveValue('75')
})

test('startapp=lang_lv switches the app language', async ({ page }) => {
  await fakeTelegram(page, 'lang_lv')
  await seed(page) // seededState.settings.language is 'en'
  await page.goto('/')
  // Sidebar Settings label is localized; 'Iestatījumi' is Latvian for Settings.
  await expect(page.getByRole('button', { name: 'Iestatījumi' })).toBeVisible()
})
