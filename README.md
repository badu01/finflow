# FinFlow

Mobile-first personal finance PWA. React + Vite, Tailwind, Framer Motion, Recharts, Supabase.

## Run

```bash
npm install
npm run dev
```

No `.env` → **demo mode**: no login, seeded sample data in localStorage.
Test on a phone over plain `http://<lan-ip>` works for the app itself. Google login and PWA install need HTTPS (use a tunnel or deploy).

## Accounts

- **With Supabase:** email + password sign up and sign in, Google, forgot password, sign out (Profile). Email-code login is off by default: Supabase only lets you edit email templates after you set up custom SMTP. Then add `{{ .Token }}` to the Magic Link and Confirm signup templates and set `VITE_EMAIL_CODE=true`.
- **Without Supabase:** profiles live on the phone. Create one, sign in by email, or tap *Explore with sample data*. Sign out is still in Profile.
- In the Supabase dashboard, Auth → Providers → Email: keep *Confirm email* on or off as you prefer. FinFlow handles both.

## Connect Supabase

1. Create a project at supabase.com.
2. SQL Editor → run `supabase/schema.sql` on a fresh project. It includes the `GRANT` statements that newer Supabase projects require.
3. Auth → Providers: enable **Email** (put `{{ .Token }}` in the template for the 6-digit code) and **Google**.
4. Auth → URL Configuration: add your site URL and `http://localhost:5173`.
5. `cp .env.example .env`, fill in URL and anon key.

## What is in it

**Tabs:** Home · Activity · Calendar · Analytics · Wallet. Profile, Search and Alerts open from the Home header. Bills, Goals, Budgets and Insights open from Home.

| Area | Details |
| --- | --- |
| Wallet | Bank accounts, credit cards in 8 colour themes (limit, outstanding, billing + due date, utilisation), debit cards (linked bank), digital wallets, cash. Live balances from transactions. |
| Money tracking | Every expense / income / transfer can be tagged to an account or card. Card spends raise outstanding; a transfer to a card is a bill payment. |
| Bills | Bills, subscriptions, EMIs, insurance, rent with due dates, repeat cycles, reminders, mark-as-paid (logs the expense, rolls the due date). Credit-card dues appear automatically. |
| Recurring | Pick Repeat when adding a transaction. Due entries post automatically on app open. |
| Budgets | Monthly + per category + daily (fixed, or monthly split across days), alerts at 50 / 75 / 90 / 100%, rollover, burn-rate projection. |
| Goals | Savings goals, wishlist, emergency fund (suggests 6 months of spend), monthly amount needed. |
| Insights | Financial health score, streaks, no-spend days, monthly challenges, badges. |
| Analytics | Pie, income vs expense, cash flow, daily line, monthly trend, savings trend, weekend vs weekday, month comparison. |
| Calendar | Month + week view, daily dots and totals, colour-coded days, swipe to change period, long-press a day to add. |
| Gestures | Swipe rows for edit / duplicate / delete, pull to refresh, swipe months. |
| Settings | Dark / light, currency symbol, bill reminders (browser notifications), PIN lock, CSV, PDF, JSON backup and restore. |
| Platform | PWA, lazy-loaded pages, safe-area support, RLS on every table. |

## Receipts and details

- Tap any transaction for its full details: category, paid from (card / bank / UPI / cash / wallet), account and bank, merchant, notes, location, receipt.
- Receipts open full screen from that sheet. Photos are shrunk before saving. In Supabase mode they go to Storage; otherwise they stay in this device's IndexedDB.

## Notes

- Home balance = bank + wallet + cash balances (opening balance plus tagged transactions) plus untagged income minus untagged expenses.
- Cards: only the last 4 digits are stored. Never add a full number or CVV.
- Currency changes the symbol only. No conversion.
- PIN lock is a screen lock on the device, not encryption.
- Reminders fire while FinFlow is open. True background push needs a Supabase Edge Function + pg_cron writing to `notifications` (table is ready).
- Receipts live at `receipts/<user_id>/…`. Read one with `createSignedUrl(path, 60)`.
- PWA icon is an SVG placeholder. Add 192 / 512 PNGs for best install support.

## Not built yet

Expense split, UPI / SMS import, bank sync, AI assistant, voice entry, OCR, investments, net worth, family budgets, multi-currency conversion.
