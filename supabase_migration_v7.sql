-- FinTrack v7: Payment history for credit cards and liabilities
-- Run in Supabase SQL Editor

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

ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment history" ON public.payment_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payment history" ON public.payment_history FOR INSERT WITH CHECK (auth.uid() = user_id);
