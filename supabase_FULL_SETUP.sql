-- ============================================================
-- FINTRACK COMPLETE DATABASE SETUP
-- Run this ONCE in Supabase SQL Editor to ensure everything works
-- Safe to re-run - uses IF NOT EXISTS / IF EXISTS everywhere
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  display_name text,
  created_at timestamptz DEFAULT now()
);

-- Accounts (bank, e-wallet, cash, credit card)
CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  balance numeric(12,2) DEFAULT 0,
  type text DEFAULT 'bank',
  icon text DEFAULT '🏦',
  color text DEFAULT '#3b82f6',
  credit_limit numeric(12,2) DEFAULT 0,
  billing_day integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Fix account type constraint to include credit_card
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_type_check;
ALTER TABLE public.accounts ADD CONSTRAINT accounts_type_check CHECK (type IN ('bank', 'ewallet', 'cash', 'credit_card'));

-- Ensure all account columns exist
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS icon text DEFAULT '🏦';
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS color text DEFAULT '#3b82f6';
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS credit_limit numeric(12,2) DEFAULT 0;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS billing_day integer DEFAULT 0;

-- Transactions (expenses & income)
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  amount numeric(12,2) NOT NULL,
  category text NOT NULL,
  description text,
  type text CHECK (type IN ('income', 'expense')) NOT NULL,
  date date NOT NULL DEFAULT current_date,
  time text DEFAULT '',
  location text DEFAULT '',
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Ensure all transaction columns exist
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS time text DEFAULT '';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS location text DEFAULT '';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;

-- Budget categories
CREATE TABLE IF NOT EXISTS public.budgets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  budgeted numeric(12,2) DEFAULT 0,
  type text CHECK (type IN ('needs', 'wants', 'savings')) DEFAULT 'needs',
  icon text DEFAULT 'CircleDot',
  created_at timestamptz DEFAULT now()
);

-- Savings goals
CREATE TABLE IF NOT EXISTS public.goals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  target numeric(12,2) DEFAULT 0,
  current numeric(12,2) DEFAULT 0,
  deadline date,
  color text DEFAULT '#3b82f6',
  category text DEFAULT 'other',
  icon text DEFAULT '🎯',
  notes text DEFAULT '',
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Ensure all goal columns exist
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS category text DEFAULT 'other';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS icon text DEFAULT '🎯';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS notes text DEFAULT '';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS priority integer DEFAULT 0;

-- Goal transactions (deposit/withdraw history)
CREATE TABLE IF NOT EXISTS public.goal_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  goal_id uuid REFERENCES public.goals ON DELETE CASCADE NOT NULL,
  amount numeric(12,2) NOT NULL,
  type text CHECK (type IN ('deposit', 'withdraw')) NOT NULL,
  note text DEFAULT '',
  date date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);

-- Liabilities (loans, debts)
CREATE TABLE IF NOT EXISTS public.liabilities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  creditor text DEFAULT '',
  total_amount numeric(12,2) DEFAULT 0,
  remaining_amount numeric(12,2) DEFAULT 0,
  monthly_payment numeric(12,2) DEFAULT 0,
  deadline date,
  notes text DEFAULT '',
  color text DEFAULT '#ef4444',
  created_at timestamptz DEFAULT now()
);

-- Monthly income/payslip records
CREATE TABLE IF NOT EXISTS public.monthly_income (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  month text NOT NULL,
  basic_pay numeric(12,2) DEFAULT 0,
  allowances numeric(12,2) DEFAULT 0,
  overtime numeric(12,2) DEFAULT 0,
  de_minimis numeric(12,2) DEFAULT 0,
  holiday_pay numeric(12,2) DEFAULT 0,
  nsd numeric(12,2) DEFAULT 0,
  gross_pay numeric(12,2) DEFAULT 0,
  sss numeric(12,2) DEFAULT 0,
  philhealth numeric(12,2) DEFAULT 0,
  pagibig numeric(12,2) DEFAULT 0,
  tax numeric(12,2) DEFAULT 0,
  other_deductions numeric(12,2) DEFAULT 0,
  net_pay numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Scan usage tracking (AI scanner rate limit)
CREATE TABLE IF NOT EXISTS public.scan_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  month text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Payment history (credit card & liability payments)
CREATE TABLE IF NOT EXISTS public.payment_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  target_type text CHECK (target_type IN ('credit_card', 'liability')) NOT NULL,
  target_id uuid NOT NULL,
  target_name text DEFAULT '',
  amount numeric(12,2) NOT NULL,
  paid_from text DEFAULT '',
  date date NOT NULL DEFAULT current_date,
  time text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. RLS POLICIES (drop + recreate to avoid duplicates)
-- ============================================================

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Accounts
DROP POLICY IF EXISTS "Users can view own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can insert own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can update own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can delete own accounts" ON public.accounts;
CREATE POLICY "Users can view own accounts" ON public.accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own accounts" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON public.accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON public.accounts FOR DELETE USING (auth.uid() = user_id);

-- Transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- Budgets
DROP POLICY IF EXISTS "Users can view own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can insert own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can update own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can delete own budgets" ON public.budgets;
CREATE POLICY "Users can view own budgets" ON public.budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own budgets" ON public.budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budgets" ON public.budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own budgets" ON public.budgets FOR DELETE USING (auth.uid() = user_id);

-- Goals
DROP POLICY IF EXISTS "Users can view own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON public.goals;
CREATE POLICY "Users can view own goals" ON public.goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON public.goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON public.goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON public.goals FOR DELETE USING (auth.uid() = user_id);

-- Goal Transactions
DROP POLICY IF EXISTS "Users can view own goal transactions" ON public.goal_transactions;
DROP POLICY IF EXISTS "Users can insert own goal transactions" ON public.goal_transactions;
DROP POLICY IF EXISTS "Users can delete own goal transactions" ON public.goal_transactions;
CREATE POLICY "Users can view own goal transactions" ON public.goal_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goal transactions" ON public.goal_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own goal transactions" ON public.goal_transactions FOR DELETE USING (auth.uid() = user_id);

-- Liabilities
DROP POLICY IF EXISTS "Users can view own liabilities" ON public.liabilities;
DROP POLICY IF EXISTS "Users can insert own liabilities" ON public.liabilities;
DROP POLICY IF EXISTS "Users can update own liabilities" ON public.liabilities;
DROP POLICY IF EXISTS "Users can delete own liabilities" ON public.liabilities;
CREATE POLICY "Users can view own liabilities" ON public.liabilities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own liabilities" ON public.liabilities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own liabilities" ON public.liabilities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own liabilities" ON public.liabilities FOR DELETE USING (auth.uid() = user_id);

-- Monthly Income
DROP POLICY IF EXISTS "Users can view own income" ON public.monthly_income;
DROP POLICY IF EXISTS "Users can insert own income" ON public.monthly_income;
DROP POLICY IF EXISTS "Users can update own income" ON public.monthly_income;
DROP POLICY IF EXISTS "Users can delete own income" ON public.monthly_income;
CREATE POLICY "Users can view own income" ON public.monthly_income FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own income" ON public.monthly_income FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own income" ON public.monthly_income FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own income" ON public.monthly_income FOR DELETE USING (auth.uid() = user_id);

-- Scan Usage
DROP POLICY IF EXISTS "Users can view own scan usage" ON public.scan_usage;
DROP POLICY IF EXISTS "Users can insert own scan usage" ON public.scan_usage;
CREATE POLICY "Users can view own scan usage" ON public.scan_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scan usage" ON public.scan_usage FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Payment History
DROP POLICY IF EXISTS "Users can view own payment history" ON public.payment_history;
DROP POLICY IF EXISTS "Users can insert own payment history" ON public.payment_history;
CREATE POLICY "Users can view own payment history" ON public.payment_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payment history" ON public.payment_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 4. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, new.raw_user_meta_data->>'display_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- DONE! All 10 tables, all columns, all RLS policies, all triggers.
-- ============================================================
