# Ledger — Budget & Savings Tracker

A frontend-only personal finance dashboard: track income/expenses, set category
budgets, save toward goals (flights, clothes, trips), and get rule-based smart
notifications about when you're on pace — all stored locally in the browser
(`localStorage`), no backend required.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Recharts (charts)
- lucide-react (icons)

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Project structure

```
src/
  components/       UI views (Dashboard, Transactions, Reports, Budgets, Goals, ...)
  lib/
    storage.ts      localStorage load/save helpers
    mockData.ts      seed data shown on first load
    insights.ts      rule-based smart notification engine
    utils.ts         formatting, date-range and aggregation helpers
  types.ts          shared TypeScript types
  App.tsx           app shell, state management, view routing
```

## Notes

- All data lives in `localStorage` under the key `ledger_app_state_v1`. Clearing
  site data (or using "Reset all data" in Settings) wipes it.
- The "smart" notifications are simple client-side rules — no external APIs —
  comparing spending pace, budget usage, and goal progress. See `src/lib/insights.ts`
  to extend the logic.
- To wire this up to a real backend later, replace `src/lib/storage.ts` with API
  calls; the rest of the app only depends on the `AppState` shape in `src/types.ts`.
