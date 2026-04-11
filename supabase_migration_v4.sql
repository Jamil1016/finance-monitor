-- FinTrack v4: Credit card support
-- Run in Supabase SQL Editor

-- Allow credit_card type
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_type_check;
ALTER TABLE public.accounts ADD CONSTRAINT accounts_type_check CHECK (type IN ('bank', 'ewallet', 'cash', 'credit_card'));

-- Add credit limit and billing day columns
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS credit_limit numeric(12,2) DEFAULT 0;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS billing_day integer DEFAULT 0;
