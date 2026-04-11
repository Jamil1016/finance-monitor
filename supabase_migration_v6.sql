-- FinTrack v6: Scan usage tracking (rate limiting AI scanner)
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.scan_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  month text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.scan_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scan usage" ON public.scan_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scan usage" ON public.scan_usage FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Also add time + location to transactions if not done
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS time text DEFAULT '';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS location text DEFAULT '';
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS billing_day integer DEFAULT 0;
