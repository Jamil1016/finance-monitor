-- FinTrack v3: Wallet - Accounts + Liabilities
-- Run in Supabase SQL Editor

-- Add new columns to accounts
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS icon text DEFAULT '🏦';
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS color text DEFAULT '#3b82f6';

-- Liabilities table
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

ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own liabilities" ON public.liabilities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own liabilities" ON public.liabilities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own liabilities" ON public.liabilities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own liabilities" ON public.liabilities FOR DELETE USING (auth.uid() = user_id);

-- Add account_id to transactions (optional - track which account paid)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;
