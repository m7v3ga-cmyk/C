-- شركة النسر الذهبي - Booking database
create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  name text,
  phone text,
  from_location text not null,
  to_location text not null,
  move_date date,
  service text,
  rooms integer not null default 0 check (rooms between 0 and 100),
  acs integer not null default 0 check (acs between 0 and 100),
  floors_down integer not null default 0 check (floors_down between 0 and 100),
  floors_up integer not null default 0 check (floors_up between 0 and 100),
  services jsonb not null default '[]'::jsonb,
  discount text,
  estimated_price numeric(12,2),
  notes text,
  source text not null default 'website',
  status text not null default 'new' check (status in ('new','contacted','confirmed','completed','cancelled')),
  client_ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists bookings_created_at_idx on public.bookings (created_at desc);
create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_phone_idx on public.bookings (phone);

-- RLS stays enabled. The public website never receives the service-role key.
-- The Vercel /api/bookings function uses the service-role key server-side.
alter table public.bookings enable row level security;

-- Remove old public policies if this script is re-run.
drop policy if exists "public can read bookings" on public.bookings;
drop policy if exists "public can insert bookings" on public.bookings;

-- No anonymous SELECT/UPDATE/DELETE policies are intentionally created.
-- Admins can manage rows from Supabase Dashboard or authenticated admin tooling.
