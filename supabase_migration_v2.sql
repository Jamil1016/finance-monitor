-- FinTrack v2 Migration: Enhanced Goals
-- Run this in Supabase SQL Editor

-- Add new columns to goals table
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS category text DEFAULT 'other';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS icon text DEFAULT '🎯';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS notes text DEFAULT '';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS priority integer DEFAULT 0;

-- Goal transactions table (deposit/withdraw history)
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

-- Enable RLS
ALTER TABLE public.goal_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for goal_transactions
CREATE POLICY "Users can view own goal transactions" ON public.goal_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goal transactions" ON public.goal_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own goal transactions" ON public.goal_transactions FOR DELETE USING (auth.uid() = user_id);
