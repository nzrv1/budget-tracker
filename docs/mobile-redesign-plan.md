# Ledger — mobile redesign plan

*Draft, 2026-09-10. Based on a hands-on audit of every screen at 375 px width with a realistic
dataset (5 budgets across day/month/year periods, 3 goals, 3 important dates, 8 transactions,
1 extra income source). Companion visual mockups: the "Ledger Mobile Redesign" artifact.*

---

## The core problem

**There is no mobile layout.** On a phone the app renders the desktop layout — a fixed 64 px
icon rail, a centred `max-w-6xl` content column, and multi-column grids — squeezed into 375 px
with only `ml-16`. Everything downstream of that breaks.

## Findings

### 1. Horizontal scroll (critical)

The page is wider than the screen on most views. Measured overflow at 375 px:

| Screen | Overflows by | Root cause |
|---|---|---|
| Dashboard | **+146 px** | `grid lg:grid-cols-3` block and the cards inside never shrink: card header rows are `flex justify-between` with a title and a `font-mono` amount, neither `min-w-0`, and tabular numbers don't wrap. Min-content of the card ≈ 441 px inside a ~279 px content area. |
| Budgets | +43 px | The Daily / Weekly / Monthly / Yearly reset selector is one non-wrapping row; "Yearly" is clipped. |
| Goals | +25 px | Long goal names ("Trip to Japan for two weeks in spring") neither wrap nor truncate. |
| Important Dates | +25 px | Same — long date names. |

**Cascade:** because `<body>` is forced to ~521 px, every `fixed inset-0` / `w-full` element
inherits that width. The Add-transaction sheet opens with its title flush to x=0 and the
"Income" tab off-screen.

### 2. Clipped / colliding controls

- **Goals:** delete (trash) icon half off-screen; "of €4,500.00" clipped; pace text runs off the
  right edge; the "Add" button next to "Add funds" is half cut off.
- **Important Dates:** the "+ New date" button overlaps the "Important Dates" heading
  (`SectionHeading` is `flex justify-between` with no wrap fallback).
- **Budgets:** the inline limit editor renders as "€0.00 of ⎯600⎯ EUR / year" — a bare
  underlined number floating between big gaps.

### 3. Wasted space

- The icon rail (`w-16`, 64 px) is **17 % of screen width**, permanently. Content gets ~279 px.
  Screen titles wrap to 2–3 lines ("Your budget, at a / glance").
- Dashboard: four stat cards in a 2×2 grid at wildly unequal heights — "Spent" is nearly empty,
  "In theory you can save" is a six-line block.

### 4. Touch targets below 40 px

- Edit / delete (pencil, trash) everywhere: **30 × 30**
- Settings: remove-income-source **14 × 14**; reminder ± **15 × 15**; steppers **27 × 27**
- "This Month / This Year", "View all", "All": 20–36 px tall
- Budgets inline limit field: **64 × 17**

### 5. Other

- Calendar: twelve month cards with decorative day grids stacked vertically — a very long scroll
  for little information; the grids aren't interactive.
- Placeholder text `Add  funds` has a double space (Goals, Important Dates).
- `ToastStack` logs a React duplicate-key warning (`insight-mom-...`) — pre-existing, in
  `insights.ts`, unrelated to layout.
- Notification toasts overlap bottom content on mobile.

### What already works

- The onboarding wizard (stage 16.5) — the one screen actually built for mobile.
- Transactions, Reports, Notifications — no horizontal scroll.
- Settings — single-column forms, fine.

---

## Decisions locked (2026-09-10)

- **Navigation:** 5-tab bottom bar — Dashboard · Transactions · Budgets · Goals · Calendar.
  "More" sheet holds Reports · Important Dates · Notifications · Settings. Unread badge
  bubbles to the "More" icon. Rail unchanged on `lg+`.
- **Dashboard hero:** stays **Total balance** (not "Safe to spend"). The restructure still
  happens — hero balance → even 4-tile strip (Income · Spent · Safe to spend · Set aside) →
  savings goal + recent as rows.
- **Card actions:** a single 44 px `⋯` button → action sheet (Edit / Delete). Budgets:
  whole-card tap opens the edit sheet, Delete lives inside it. Delete everywhere gets a
  confirm step or an "Undo" toast.
- **Loading (H2):** inside Telegram, hold the first paint behind a skeleton until the
  "who's newer" sync decision resolves (~1.5 s cap), then render once — no state jump.
  Scheduled for stage 17.6. Broad error-state work (save failed / offline / retry) is a
  separate follow-up, not in this pass.

## Redesign direction

Keep the visual language (Space Grotesk / Inter / IBM Plex Mono, the sage/gold/clay/ink/paper
palette, 8 px radius). Change the **layout system** for `< lg`.

1. **Navigation** — replace the fixed side rail on `< lg` with a bottom tab bar: 5 primary
   destinations (Dashboard, Transactions, Budgets, Goals, Calendar) + a "More" sheet for
   Reports / Important Dates / Notifications / Settings. Rail stays on `lg+`. Bottom bar clears
   `env(safe-area-inset-bottom)`.
2. **Container** — on `< lg`, drop `ml-16` and `max-w-6xl`; content is full-bleed with 16 px
   gutters, one column. Add a global `overflow-x: clip` guard on the app root so a single
   runaway element can never scroll the whole page again.
3. **Cards** — one card pattern: label/title on its own line, the number on the next line
   (never `justify-between` with two rigid children). `min-w-0` on every grid/flex child that
   holds text; long names `truncate` with the full value elsewhere in the card.
4. **Row actions** — edit/delete become a single 44 px "⋯" menu, or a swipe action; no more
   pairs of 30 px icons.
5. **Forms** — the Budgets inline limit editor becomes a normal field (tap the card → edit
   sheet, or an always-visible input at 44 px). Fix the double-space placeholders.
6. **Dashboard** — a single hero figure (balance or "safe to spend"), then a compact 2-up
   stat strip with equal heights, then the savings/budget summary as plain rows, then recent
   transactions. No 2×2 grid of unequal cards.
7. **Calendar** — collapse each month to a one-line summary (month + set-aside total); tap to
   expand the grid. Default to the current + next two months expanded.

---

## Stages (stop for review after each)

Continues the numbering from the wizard work (last stage 16.5).

- **17.1 — Layout shell.** 5-tab bottom bar (Dashboard · Transactions · Budgets · Goals ·
  Calendar) + "More" sheet (Reports · Important Dates · Notifications · Settings, badge on
  "More"); rail becomes `hidden lg:flex`; `<main>` loses `ml-16` below `lg` and gains bottom
  padding for the bar + `env(safe-area)` top/bottom; global `overflow-x: clip` guard on the app
  root. No screen-level changes. Rewrite `e2e/mobile-nav.spec.ts` (its "no More step" premise is
  reversed). Verify: every screen reachable, no horizontal scroll at 375 px, `lg+` unchanged.
- **17.2 — Card & row primitives.** A shared `StatTile` / `SummaryRow` / `RowActions` set;
  apply to Dashboard. Kill the Dashboard `grid lg:grid-cols-3` overflow.
- **17.3 — Goals + Important Dates.** Card layout that fits; name wrapping; `SectionHeading`
  wrap fallback; the "add funds" row; 44 px actions.
- **17.4 — Budgets.** Reset selector that fits (wrap or dropdown on mobile); limit editing
  rework; card layout.
- **17.5 — Calendar.** Collapsible months.
- **17.6 — Sweep.** Settings tap targets; toast placement; placeholder fixes; full
  `tsc` / `build` / `playwright` + a new `e2e/mobile-layout.spec.ts` asserting no horizontal
  scroll on every view at 375 px.

Each stage: real `npx tsc --noEmit`, `npm run build`, `npx playwright test` on the user's
machine, plus a 375 px browser pass.
