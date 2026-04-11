-- FinTrack v4: Add credit card type to accounts
-- Run in Supabase SQL Editor

-- Remove old constraint and add new one with credit_card
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_type_check;
ALTER TABLE public.accounts ADD CONSTRAINT accounts_type_check CHECK (type IN ('bank', 'ewallet', 'cash', 'credit_card'));
