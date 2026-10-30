-- FinFlow v2 · Supabase schema. Run on a FRESH project in the SQL Editor.
-- Already ran v1? Drop the old tables first (or use a new project). Row Level Security is on for every table.
-- Wallet items (banks, cards, wallets, cash) all live in `accounts`, so a transaction needs only one account_id.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  currency text not null default 'INR',
  created_at timestamptz not null default now()
);

-- accounts: bank | debit | credit | wallet | cash
-- NEVER store a full card number or CVV. Only the last 4 digits.
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('bank', 'debit', 'credit', 'wallet', 'cash')),
  bank_name text,
  nickname text not null,
  account_type text check (account_type in ('Savings', 'Current')),
  last4 char(4) check (last4 ~ '^[0-9]{4}$'),
  balance numeric(14,2) not null default 0,         -- opening balance (bank / wallet / cash)
  credit_limit numeric(14,2),                        -- credit cards
  outstanding numeric(14,2) not null default 0,      -- opening outstanding (credit cards)
  billing_day int check (billing_day between 1 and 31),
  due_day int check (due_day between 1 and 31),
  linked_account_id uuid references public.accounts on delete set null, -- debit card -> bank
  color text,                                        -- card theme id (violet, ocean, rose, …)
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  icon text,
  color text,
  subcategories text[] not null default '{}',
  unique (user_id, name)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  type text not null check (type in ('expense', 'income', 'transfer')),
  amount numeric(14,2) not null check (amount > 0),
  category text,
  subcategory text,
  merchant text,
  payment_method text,
  account_id uuid references public.accounts on delete set null,    -- paid from / received in / transfer from
  to_account_id uuid references public.accounts on delete set null, -- transfer to (a credit card = bill payment)
  source text,
  notes text,
  location text,
  receipt_path text,
  recurring_id uuid,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists tx_user_time on public.transactions (user_id, occurred_at desc);
create index if not exists tx_user_acct on public.transactions (user_id, account_id);

-- budgets: category 'all' = whole month, 'daily' = fixed daily limit. rollover carries unspent amount into next month.
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  category text not null default 'all',
  amount numeric(14,2) not null check (amount > 0),
  rollover boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, category)
);

create table if not exists public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  type text not null check (type in ('expense', 'income')),
  amount numeric(14,2) not null check (amount > 0),
  category text,
  subcategory text,
  merchant text,
  payment_method text,
  account_id uuid references public.accounts on delete set null,
  source text,
  notes text,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  next_run date not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- subscriptions: bills, subscriptions, EMIs, insurance, rent
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  amount numeric(14,2) not null check (amount > 0),
  kind text not null default 'bill' check (kind in ('bill', 'subscription', 'emi', 'insurance', 'rent', 'other')),
  cycle text not null default 'monthly' check (cycle in ('once', 'weekly', 'monthly', 'quarterly', 'yearly')),
  next_due date not null,
  category text not null default 'Bills',
  account_id uuid references public.accounts on delete set null,
  autopay boolean not null default false,
  remind_days_before int not null default 3,
  last_paid date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- goals: kind 'goal' | 'emergency'; is_wishlist turns a goal into a wishlist item
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  kind text not null default 'goal' check (kind in ('goal', 'emergency')),
  target_amount numeric(14,2) not null check (target_amount > 0),
  saved_amount numeric(14,2) not null default 0,
  target_date date,
  is_wishlist boolean not null default false,
  created_at timestamptz not null default now()
);

-- notifications: reserved for server-side push / email (alerts in the app are computed live)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('budget_alert', 'bill_due', 'weekly_summary', 'monthly_report')),
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------
alter table public.users enable row level security;
create policy "users: read own" on public.users for select using (id = auth.uid());
create policy "users: update own" on public.users for update using (id = auth.uid()) with check (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array[
    'accounts', 'categories', 'transactions', 'budgets',
    'recurring_transactions', 'subscriptions', 'goals', 'notifications'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s: select own" on public.%1$I for select using (user_id = auth.uid())', t);
    execute format('create policy "%1$s: insert own" on public.%1$I for insert with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s: update own" on public.%1$I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s: delete own" on public.%1$I for delete using (user_id = auth.uid())', t);
  end loop;
end $$;

-- ---------- Profile row on signup ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Storage: private receipts bucket, one folder per user ----------
insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "receipts: read own" on storage.objects for select
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "receipts: upload own" on storage.objects for insert
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "receipts: delete own" on storage.objects for delete
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Data API grants ----------
-- Supabase no longer exposes new public tables to the API automatically (new projects since May 2026,
-- every project from 30 Oct 2026). RLS above decides WHICH rows; these grants decide WHETHER the table is reachable.
-- FinFlow only ever acts as a signed-in user, so only `authenticated` gets access. `anon` gets nothing.
grant usage on schema public to authenticated;
grant select, update on public.users to authenticated;
grant select, insert, update, delete on
  public.accounts, public.categories, public.transactions, public.budgets,
  public.recurring_transactions, public.subscriptions, public.goals, public.notifications
to authenticated;
revoke all on all tables in schema public from anon;
-- the signup trigger still runs; this just stops anyone calling it directly over the API
revoke execute on function public.handle_new_user() from public, anon, authenticated;
