-- FinTrack v5: Time + Location tracking on transactions
-- Run in Supabase SQL Editor

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS time text DEFAULT '';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS location text DEFAULT '';

-- Also add billing_day if not already done
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS billing_day integer DEFAULT 0;
