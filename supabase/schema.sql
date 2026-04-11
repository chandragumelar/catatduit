-- ===== CATATDUIT v4 — Supabase Schema =====
-- Run di Supabase SQL Editor

-- Users table
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  trial_start   timestamptz not null default now(),
  trial_expires timestamptz not null default now() + interval '14 days',
  is_paid       boolean not null default false,
  key_used      text,
  created_at    timestamptz default now()
);

-- License keys table
create table if not exists public.license_keys (
  key           text primary key,
  is_used       boolean not null default false,
  used_by_email text,
  used_at       timestamptz,
  created_at    timestamptz default now()
);

-- RLS: aktifkan
alter table public.users enable row level security;
alter table public.license_keys enable row level security;

-- Users: authenticated user hanya bisa read row miliknya sendiri
create policy "users_select_own" on public.users
  for select using (auth.jwt() ->> 'email' = email);

create policy "users_update_own" on public.users
  for update using (auth.jwt() ->> 'email' = email);

-- license_keys: TIDAK ada policy untuk anon/authenticated
-- Hanya service role (Edge Function) yang bisa akses
-- Tidak perlu create policy — default deny sudah cukup

-- Index untuk performa
create index if not exists users_email_idx on public.users(email);
create index if not exists license_keys_used_idx on public.license_keys(is_used);
