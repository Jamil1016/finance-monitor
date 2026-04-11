# FinTrack - Personal Finance Monitor

A comprehensive personal finance tracking app built as a Progressive Web App (PWA). Track expenses, income, budgets, savings goals, accounts, liabilities, and payslips -- all in one place.

**Live App:** [finance-monitor-beige.vercel.app](https://finance-monitor-beige.vercel.app)

Built by **Jamil Mendez**

## Features

### Dashboard
- KPI cards: Expenses, Income, Cash Flow, Budget Remaining
- Period filter: Daily / Weekly / Monthly / Year
- Smart budget with rollover from unspent periods
- Income vs Expenses bar chart (yearly trend)
- Weekly spending pattern chart
- Budget utilization per category
- Savings goal progress overview
- Account balances at a glance

### Expense & Income Tracking
- Add expenses and income with category selection
- Pay-from account selector (deducts from bank/e-wallet, charges to credit card)
- Time and location auto-capture (optional, toggle in Settings)
- Search transactions
- Filter by Today / Week / Month
- Category icons with donut chart breakdown
- Spending streak tracker
- Month-over-month comparison
- Edit and delete transactions

### Budget Monitor
- Set monthly budgets per category (Needs / Wants)
- Daily allowance calculator
- Spending pace alert (under/over pace)
- Projected month-end savings
- Add/remove custom categories
- Progress bars with color-coded warnings

### Savings Goals
- Create goals with categories: Emergency, Travel, Investment, Purchase, Debt, Education, Retirement
- Pre-made goal templates for quick setup
- Milestone markers at 25% / 50% / 75% / 100%
- Deposit and withdraw with notes
- Full transaction history per goal
- Daily / weekly / monthly savings pace calculator

### Wallet
- Manage accounts: Bank, E-Wallet, Cash, Credit Card
- Credit card support: credit limit, billing due date, balance owed vs available credit
- Liabilities tracking: loans, debts with deadlines and monthly payments
- Transfer money between accounts
- Pay credit cards and liabilities with history log
- Net worth overview (assets - liabilities)

### Income & Payslips
- AI-powered payslip scanner (upload photo or take picture)
- Extracts: basic pay, OT, allowances, tax, SSS, PhilHealth, Pag-IBIG
- Manual entry with full form
- Edit and delete records
- Payslip view vs Monthly combined view toggle
- Year selector for historical data
- YTD totals and averages
- Tax projection with bracket calculation

### Analysis
- Deep-dive statistics page
- Income vs Expenses bar chart
- Spending by category with percentage bars
- Spending by day of week pattern
- Expense trend line chart

### Settings
- 6 color themes: Mint Green, Ocean Blue, Rose Pink, Royal Purple, Sunset Orange, Slate Dark
- Change password
- Location tracking toggle
- Log out

### Authentication
- Email/password signup and login
- Google OAuth
- GitHub OAuth
- Row Level Security: each user sees only their own data

## Tech Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **Charts:** Recharts
- **AI:** Claude Haiku API (payslip scanner)
- **Hosting:** Vercel (auto-deploys from GitHub)
- **PWA:** Installable on phone and desktop

## Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/Jamil1016/finance-monitor.git
cd finance-monitor
npm install
```

### 2. Set up environment
Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
ANTHROPIC_API_KEY=your_anthropic_key
```

### 3. Set up database
Run `supabase_FULL_SETUP.sql` in your Supabase SQL Editor. This creates all 10 tables, columns, RLS policies, and triggers.

### 4. Run locally
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Database

10 tables with Row Level Security:
- `profiles` - User profiles (auto-created on signup)
- `accounts` - Bank, e-wallet, cash, credit card
- `transactions` - Expenses and income with time/location
- `budgets` - Monthly budget categories
- `goals` - Savings goals with categories and milestones
- `goal_transactions` - Deposit/withdraw history per goal
- `liabilities` - Loans, debts, credit obligations
- `monthly_income` - Payslip records
- `scan_usage` - AI scanner rate limiting (10/month)
- `payment_history` - Credit card and liability payment log

## License

Personal project by Jamil Mendez.
