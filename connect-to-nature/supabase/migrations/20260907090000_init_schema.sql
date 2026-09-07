-- ============================================================================
-- Connect to Nature — core schema
--
-- One database behind both portals. A single profiles table carries the role
-- (traveler | host | admin); the customer portal and the shetkari portal read
-- and write the same listings, availability and bookings rows.
--
-- Translatable content is stored as jsonb of the shape {"en": …, "hi": …,
-- "mr": …} rather than as three columns, so a fourth language is a data change
-- and not a migration.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ─── enums ──────────────────────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('traveler', 'host', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type verification_status as enum ('draft', 'pending', 'approved', 'rejected', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type listing_status as enum ('draft', 'pending', 'published', 'paused', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type booking_status as enum ('pending', 'confirmed', 'cancelled', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  -- 'demo' marks a booking that completed while Razorpay keys were absent.
  create type payment_status as enum ('unpaid', 'paid', 'refunded', 'failed', 'demo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type activity_category as enum ('farming', 'trekking', 'water', 'food', 'camping', 'culture', 'craft', 'stars');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payout_status as enum ('scheduled', 'released', 'held');
exception when duplicate_object then null; end $$;

-- ─── profiles ───────────────────────────────────────────────────────────────
-- One row per auth.users row, created by the trigger at the bottom of this file.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'traveler',
  full_name text,
  phone text,
  email citext,
  preferred_language text not null default 'en' check (preferred_language in ('en', 'hi', 'mr')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.role is
  'traveler | host | admin. Both portals authenticate against the same table; the portal a person lands on is decided by this column, not by a separate account.';

-- ─── regions (vibhag) ───────────────────────────────────────────────────────
-- Admin adds a vibhag by inserting a row. Nothing in the application hard-codes
-- Kokan or Nashik.
create table if not exists public.regions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name jsonb not null,
  tagline jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  districts jsonb not null default '[]'::jsonb,
  season jsonb not null default '{}'::jsonb,
  reach jsonb not null default '{}'::jsonb,
  hero_scene text not null default 'hills',
  accent text not null default '#2f7d5b',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─── activities ─────────────────────────────────────────────────────────────
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name jsonb not null,
  description jsonb not null default '{}'::jsonb,
  category activity_category not null,
  duration_minutes integer not null default 90,
  -- Which parts of a day the activity suits; the trip planner fills its slots
  -- from this. Values: morning | midday | afternoon | evening | night.
  slots text[] not null default '{morning,afternoon}',
  icon text,
  created_at timestamptz not null default now()
);

-- ─── host profiles ──────────────────────────────────────────────────────────
create table if not exists public.host_profiles (
  id uuid primary key default gen_random_uuid(),
  -- Nullable so the demonstration seed can carry farms with no signed-in owner.
  -- Every host created through the onboarding flow has one.
  user_id uuid unique references public.profiles (id) on delete cascade,
  farm_name jsonb not null,
  host_name jsonb not null,
  bio jsonb not null default '{}'::jsonb,
  region_id uuid not null references public.regions (id) on delete restrict,
  district text not null,
  village jsonb not null default '{}'::jsonb,
  phone text,
  land_acres numeric(6, 2),
  languages text[] not null default '{mr}',
  verification_status verification_status not null default 'pending',
  verification_note text,
  verified_at timestamptz,
  hosting_since integer,
  payout_upi text,
  payout_account_last4 text,
  payout_ifsc text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists host_profiles_region_idx on public.host_profiles (region_id);
create index if not exists host_profiles_status_idx on public.host_profiles (verification_status);

-- ─── listings ───────────────────────────────────────────────────────────────
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.host_profiles (id) on delete cascade,
  slug text not null unique,
  title jsonb not null,
  description jsonb not null default '{}'::jsonb,
  region_id uuid not null references public.regions (id) on delete restrict,
  district text not null,
  village jsonb not null default '{}'::jsonb,
  stay_type text not null default 'farm_cottage',
  -- Procedural artwork drawn for a listing with no photographs yet, so a farm
  -- that onboarded this morning still has a page worth looking at.
  scene text not null default 'orchard',
  crops text[] not null default '{}',
  base_price numeric(10, 2) not null check (base_price >= 0),
  max_guests integer not null default 6 check (max_guests > 0),
  bedrooms integer not null default 1,
  best_months integer[] not null default '{}',
  lat numeric(9, 6),
  lng numeric(9, 6),
  status listing_status not null default 'draft',
  rating numeric(3, 2) not null default 0,
  review_count integer not null default 0,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists listings_region_idx on public.listings (region_id);
create index if not exists listings_status_idx on public.listings (status);
create index if not exists listings_price_idx on public.listings (base_price);

create table if not exists public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  url text not null,
  alt jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists listing_photos_listing_idx on public.listing_photos (listing_id, position);

create table if not exists public.listing_activities (
  listing_id uuid not null references public.listings (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete cascade,
  price_addon numeric(10, 2) not null default 0,
  note jsonb not null default '{}'::jsonb,
  primary key (listing_id, activity_id)
);

-- ─── availability ───────────────────────────────────────────────────────────
-- A row per date the host has opened. Absent date = not yet opened, which is
-- why the calendar writes rows rather than deleting them.
create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  date date not null,
  is_available boolean not null default true,
  price_override numeric(10, 2),
  unique (listing_id, date)
);

create index if not exists availability_lookup_idx on public.availability (listing_id, date) where is_available;

-- ─── curated two-day packages ───────────────────────────────────────────────
create table if not exists public.trip_packages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title jsonb not null,
  summary jsonb not null default '{}'::jsonb,
  region_id uuid not null references public.regions (id) on delete restrict,
  listing_id uuid references public.listings (id) on delete set null,
  duration_days integer not null default 2,
  price_per_person numeric(10, 2) not null,
  -- [{ day, slot, time, activity_id?, title jsonb, note jsonb }]
  itinerary jsonb not null default '[]'::jsonb,
  included_activities uuid[] not null default '{}',
  hero_photo text,
  is_featured boolean not null default false,
  status listing_status not null default 'published',
  created_at timestamptz not null default now()
);

-- ─── itineraries built in the planner ───────────────────────────────────────
create table if not exists public.custom_itineraries (
  id uuid primary key default gen_random_uuid(),
  traveler_id uuid references public.profiles (id) on delete cascade,
  region_id uuid references public.regions (id) on delete set null,
  listing_id uuid references public.listings (id) on delete set null,
  title text,
  guest_count integer not null default 2,
  interests text[] not null default '{}',
  budget_per_person numeric(10, 2),
  days jsonb not null default '[]'::jsonb,
  total_price numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

-- ─── bookings ───────────────────────────────────────────────────────────────
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  traveler_id uuid references public.profiles (id) on delete set null,
  listing_id uuid references public.listings (id) on delete restrict,
  trip_package_id uuid references public.trip_packages (id) on delete set null,
  itinerary_id uuid references public.custom_itineraries (id) on delete set null,
  start_date date not null,
  end_date date not null,
  guest_count integer not null default 2 check (guest_count > 0),
  guest_name text not null,
  guest_phone text not null,
  guest_note text,
  language text not null default 'en',
  total_amount numeric(10, 2) not null,
  farmer_amount numeric(10, 2) not null,
  platform_fee numeric(10, 2) not null,
  status booking_status not null default 'pending',
  payment_status payment_status not null default 'unpaid',
  razorpay_order_id text,
  razorpay_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_dates_ordered check (end_date > start_date)
);

create index if not exists bookings_traveler_idx on public.bookings (traveler_id, start_date desc);
create index if not exists bookings_listing_idx on public.bookings (listing_id, start_date);

-- ─── payouts ────────────────────────────────────────────────────────────────
create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.host_profiles (id) on delete cascade,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  amount numeric(10, 2) not null,
  status payout_status not null default 'scheduled',
  released_at timestamptz,
  created_at timestamptz not null default now(),
  unique (booking_id)
);

-- ─── reviews ────────────────────────────────────────────────────────────────
-- One review per booking, which is what makes a review verified: there is no
-- way to write one without a booking row that completed.
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  traveler_id uuid references public.profiles (id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment jsonb not null default '{}'::jsonb,
  photos text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists reviews_listing_idx on public.reviews (listing_id, created_at desc);

-- ─── wishlists ──────────────────────────────────────────────────────────────
create table if not exists public.wishlists (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- ─── host onboarding leads ──────────────────────────────────────────────────
-- A farmer who fills the short form on the shetkari portal before creating an
-- account. The field team calls these.
create table if not exists public.host_leads (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  phone text not null,
  village text,
  district text,
  region_id uuid references public.regions (id) on delete set null,
  land_acres numeric(6, 2),
  beds integer,
  crops text,
  language text not null default 'mr',
  status text not null default 'new',
  created_at timestamptz not null default now()
);
