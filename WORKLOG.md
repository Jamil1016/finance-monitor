# FinTrack - Work Log

## Project Info
- **App:** FinTrack - Personal Finance Monitor
- **Live URL:** https://finance-monitor-beige.vercel.app/
- **GitHub:** https://github.com/Jamil1016/finance-monitor
- **Tech:** Next.js 15, TypeScript, Tailwind CSS, Supabase, Recharts
- **Supabase Project:** xkiukujfcsgvfdnvzgwm (jamilmendez1016@gmail.com)
- **AI Scanner:** Claude Haiku via Anthropic API

---

## Session 1 - April 10-11, 2026

### Phase 1: Tax Analysis (before app existed)
- Analyzed 12 payslips (Sep 2025 - Mar 2026) from Nanoninth
- Verified all withholding tax calculations against PH TRAIN law
- Reviewed BIR Form 2316 from both employers (Copeland + Nanoninth)
- Created Form 1700 reference data for 2025 filing
- Created Excel salary summary + financial plan + 400K savings roadmap
- Identified eBIRForms using old tax table (computing 106K instead of 40K)
- Drafted email to accountant Roy about the issue

### Phase 2: App Creation
- Scaffolded Next.js project with TypeScript + Tailwind
- Built 5 core pages: Dashboard, Expenses, Budget, Goals, Income
- Supabase connected (project xkiukujfcsgvfdnvzgwm)
- Email/password auth (signup/login)
- Row Level Security on all tables
- Deployed to Vercel (auto-deploys from GitHub)

### Phase 3: Features Built
1. **AI Payslip Scanner** - Upload/photo → Claude Haiku extracts all payslip fields
2. **6 Theme Options** - Mint Green, Ocean Blue, Rose Pink, Royal Purple, Sunset Orange, Slate Dark
3. **FinWise-style Redesign** - Tinted surfaces, gradient hero cards, pill buttons, rounded cards
4. **Dashboard Analytics** - KPI cards, area/bar charts, donut chart, weekly spending, budget utilization
5. **Period Filter** - Daily/Weekly/Monthly/Year with smart budget rollover
6. **Expense Tracker** - Add/delete, category icons, month navigation, search, time filters
7. **Budget Monitor** - Per-category progress bars, spending pace, daily allowance, add/remove categories
8. **Savings Goals** - Categories, templates, milestones (25/50/75/100%), deposit/withdraw history, notes
9. **Wallet Page** - Accounts (bank/ewallet/cash/credit card), liabilities, net worth, transfer between accounts
10. **Income Tracker** - AI scanner, manual entry, edit/delete, YTD totals, tax projection
11. **Analysis Page** - Deep-dive charts: income vs expenses, category breakdown, day-of-week pattern, trends
12. **Settings Page** - Profile, change password, theme, logout, delete account
13. **Credit Card Support** - Expense adds to balance (debt), separate section in wallet
14. **Pay-from Account** - Select which account/card to deduct from on every expense
15. **FAB Menu** - + button shows Add Income (green) or Add Expense (red)
16. **Tooltips** - Hover on desktop, long-press on mobile for descriptions
17. **Transfer** - Move money between accounts on wallet page

### Phase 4: Bug Fixes
- Fixed Supabase "Failed to execute fetch" error (hardcoded keys)
- Fixed modal buttons hidden behind mobile bottom nav (z-index + margin)
- Fixed month display showing previous month (timezone UTC bug)
- Fixed AI scanner media type for PDFs
- Switched AI from Sonnet to Haiku (10x cheaper)
- Fixed eBIRForms old tax table issue (emailed accountant)
- Fixed Year filter showing no data
- Fixed credit card DB constraint (migration v4)

---

## Database Migrations (run in order)
1. `supabase_migration.sql` - Initial tables (profiles, accounts, transactions, budgets, goals, monthly_income)
2. `supabase_migration_v2.sql` - Goal categories, goal_transactions table
3. `supabase_migration_v3.sql` - Liabilities table, account icon/color columns, transaction account_id
4. `supabase_migration_v4.sql` - Allow credit_card type in accounts

---

## Expense Categories
Food & Groceries, Transportation, Utilities & Phone, Personal Care, Social & Leisure, Health, Shopping, Subscriptions, Miscellaneous

## Income Categories
Salary, Freelance, Gift, Investment, Refund, Other

## Account Types
Bank (🏦), E-Wallet (📱), Cash (💵), Credit Card (💳)

---

## Files & Structure
```
src/
  app/
    page.tsx          - Dashboard (KPIs, charts, hero card, FAB)
    layout.tsx         - Root layout with auth + theme providers
    globals.css        - FinWise-style CSS (tinted surfaces, pills, cards)
    login/page.tsx     - Login screen (gradient split)
    signup/page.tsx    - Signup screen
    expenses/page.tsx  - Expense tracker (donut, categories, time filter)
    budget/page.tsx    - Budget monitor (pace, daily allowance, add categories)
    goals/page.tsx     - Savings goals (milestones, templates, deposit history)
    wallet/page.tsx    - Accounts + liabilities + transfer
    income/page.tsx    - Payslip scanner + income history
    analysis/page.tsx  - Deep analytics charts
    settings/page.tsx  - Profile, password, theme, delete account
    api/scan-payslip/route.ts - AI scanner API (Claude Haiku)
  components/
    Sidebar.tsx        - Desktop nav
    BottomNav.tsx      - Mobile nav
    AppShell.tsx       - Auth guard + layout wrapper
    AuthGuard.tsx      - Redirect to login if not authenticated
    ThemePicker.tsx    - Theme selection modal
    ui/
      CategoryIcon.tsx - Colorful category icons with tooltips
      DonutChart.tsx   - SVG donut chart
      TimeTabs.tsx     - Period selector (Day/Week/Month/Year)
      Tooltip.tsx      - Hover/long-press tooltip
  lib/
    supabase.ts        - Supabase client
    auth.tsx           - Auth context provider
    database.ts        - All Supabase CRUD operations
    storage.ts         - localStorage helpers (legacy, pre-Supabase)
    types.ts           - TypeScript interfaces + constants
    utils.ts           - Formatting, categories, colors
    themes.ts          - Theme definitions (6 themes)
    theme-context.tsx  - Theme context provider
```

---

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Hardcoded in supabase.ts (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Hardcoded in supabase.ts (public)
- `ANTHROPIC_API_KEY` - Server-only, set in Vercel env vars for AI scanner
- `SCAN_BYPASS_PASSWORD` - Server-only, Vercel env (default: fintrack2026admin)

## OAuth Providers (configured in Supabase Dashboard → Auth → Providers)
- **GitHub** - Client ID: Ov23lifihb5U0VO4Bo0L | App: github.com/settings/developers
- **Google** - Client ID: 569781326037-...googleusercontent.com | Console: console.cloud.google.com
- **Facebook** - App ID: 978888577899375 | Console: developers.facebook.com
- All use callback URL: `https://xkiukujfcsgvfdnvzgwm.supabase.co/auth/v1/callback`

---

## Database Migrations (run in order)
1. `supabase_migration.sql` - Initial tables
2. `supabase_migration_v2.sql` - Goal categories, goal_transactions
3. `supabase_migration_v3.sql` - Liabilities, account icon/color
4. `supabase_migration_v4.sql` - Credit card type + credit_limit + billing_day
5. `supabase_migration_v5.sql` - Time + location on transactions
6. `supabase_migration_v6.sql` - Scan usage tracking (rate limit)
7. `supabase_migration_v7.sql` - Payment history

---

## Tools Created
- `C:\Users\admin\Desktop\Projects\tools\extract_frames.py` - Video frame extractor (keyframe mode, interval mode)
- `C:\Users\admin\Desktop\Projects\Tax-monitoring\Form1700_Reference_2025.md` - BIR Form 1700 data
- `C:\Users\admin\Desktop\Projects\Tax-monitoring\Salary_Summary_and_Financial_Plan.xlsx` - Excel with payslip data + financial plan

---

## Pending / TODO
- [ ] Test OAuth login (GitHub, Google, Facebook) on deployed app
- [ ] Calendar view for transactions
- [ ] Category detail pages (tap category → see all transactions)
- [ ] Enhanced search filters (date range, category, amount range)
- [ ] BIR Form 1700 filing (waiting for accountant Roy's reply on eBIRForms tax table issue - DEADLINE APR 15!)
- [ ] Onboarding flow for new users
- [ ] Export data as PDF/Excel
- [ ] Dark mode theme
- [ ] Notification/reminders for budget limits and bill deadlines
