-- FinTrack Database Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/xkiukujfcsgvfdnvzgwm/sql)

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  created_at timestamptz default now()
);

-- Accounts (bank, e-wallet, cash)
create table public.accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  balance numeric(12,2) default 0,
  type text check (type in ('bank', 'ewallet', 'cash')) default 'bank',
  created_at timestamptz default now()
);

-- Transactions (expenses & income)
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  amount numeric(12,2) not null,
  category text not null,
  description text,
  type text check (type in ('income', 'expense')) not null,
  date date not null default current_date,
  created_at timestamptz default now()
);

-- Budget categories
create table public.budgets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  budgeted numeric(12,2) default 0,
  type text check (type in ('needs', 'wants', 'savings')) default 'needs',
  icon text default 'CircleDot',
  created_at timestamptz default now()
);

-- Savings goals
create table public.goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  target numeric(12,2) default 0,
  current numeric(12,2) default 0,
  deadline date,
  color text default '#3b82f6',
  created_at timestamptz default now()
);

-- Monthly income/payslip records
create table public.monthly_income (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  month text not null,
  basic_pay numeric(12,2) default 0,
  allowances numeric(12,2) default 0,
  overtime numeric(12,2) default 0,
  de_minimis numeric(12,2) default 0,
  holiday_pay numeric(12,2) default 0,
  nsd numeric(12,2) default 0,
  gross_pay numeric(12,2) default 0,
  sss numeric(12,2) default 0,
  philhealth numeric(12,2) default 0,
  pagibig numeric(12,2) default 0,
  tax numeric(12,2) default 0,
  other_deductions numeric(12,2) default 0,
  net_pay numeric(12,2) default 0,
  created_at timestamptz default now()
);

-- Enable Row Level Security on all tables
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;
alter table public.monthly_income enable row level security;

-- RLS Policies: users can only see/modify their own data
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "Users can view own accounts" on public.accounts for select using (auth.uid() = user_id);
create policy "Users can insert own accounts" on public.accounts for insert with check (auth.uid() = user_id);
create policy "Users can update own accounts" on public.accounts for update using (auth.uid() = user_id);
create policy "Users can delete own accounts" on public.accounts for delete using (auth.uid() = user_id);

create policy "Users can view own transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "Users can insert own transactions" on public.transactions for insert with check (auth.uid() = user_id);
create policy "Users can update own transactions" on public.transactions for update using (auth.uid() = user_id);
create policy "Users can delete own transactions" on public.transactions for delete using (auth.uid() = user_id);

create policy "Users can view own budgets" on public.budgets for select using (auth.uid() = user_id);
create policy "Users can insert own budgets" on public.budgets for insert with check (auth.uid() = user_id);
create policy "Users can update own budgets" on public.budgets for update using (auth.uid() = user_id);
create policy "Users can delete own budgets" on public.budgets for delete using (auth.uid() = user_id);

create policy "Users can view own goals" on public.goals for select using (auth.uid() = user_id);
create policy "Users can insert own goals" on public.goals for insert with check (auth.uid() = user_id);
create policy "Users can update own goals" on public.goals for update using (auth.uid() = user_id);
create policy "Users can delete own goals" on public.goals for delete using (auth.uid() = user_id);

create policy "Users can view own income" on public.monthly_income for select using (auth.uid() = user_id);
create policy "Users can insert own income" on public.monthly_income for insert with check (auth.uid() = user_id);
create policy "Users can update own income" on public.monthly_income for update using (auth.uid() = user_id);
create policy "Users can delete own income" on public.monthly_income for delete using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
