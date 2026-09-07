/* Generates supabase/seed.sql from src/lib/seed-content.ts.
 *
 * The seed content is written once, in TypeScript, because the application
 * reads it too when no database is configured. This script is what turns it
 * into SQL, so the demo build and a freshly reset Supabase project show exactly
 * the same twelve farms.
 *
 *   node scripts/generate-seed.mjs
 *
 * Run it after editing seed-content.ts and commit both files.
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { ACTIVITIES, FARMS, PACKAGES, REGIONS, REVIEWS } from '../src/lib/seed-content.ts';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../supabase/seed.sql');

const q = (value) => `'${String(value).replace(/'/g, "''")}'`;
const json = (value) => `${q(JSON.stringify(value))}::jsonb`;
const arr = (values) => `array[${values.map(q).join(', ')}]`;
const intArr = (values) => `array[${values.join(', ')}]::integer[]`;
const nullable = (value) => (value === undefined || value === null ? 'null' : value);

const lines = [];
const w = (line = '') => lines.push(line);

w('-- ============================================================================');
w('-- Connect to Nature — seed data');
w('--');
w('-- GENERATED FILE. Do not edit by hand: change src/lib/seed-content.ts and run');
w('--   node scripts/generate-seed.mjs');
w('--');
w('-- Applied automatically by `supabase db reset`, or by hand with');
w('--   psql "$DATABASE_URL" -f supabase/seed.sql');
w('--');
w('-- Every statement is guarded, so running it twice adds nothing twice.');
w('-- ============================================================================');
w();

w('-- ─── vibhags ────────────────────────────────────────────────────────────────');
for (const region of REGIONS) {
  w(`insert into public.regions (slug, name, tagline, description, districts, season, reach, hero_scene, accent, sort_order)
values (${q(region.slug)}, ${json(region.name)}, ${json(region.tagline)}, ${json(region.description)},
        ${json(region.districts)}, ${json(region.season)}, ${json(region.reach)},
        ${q(region.heroScene)}, ${q(region.accent)}, ${region.sortOrder})
on conflict (slug) do update set
  name = excluded.name, tagline = excluded.tagline, description = excluded.description,
  districts = excluded.districts, season = excluded.season, reach = excluded.reach,
  hero_scene = excluded.hero_scene, accent = excluded.accent, sort_order = excluded.sort_order;`);
  w();
}

w('-- ─── activities ─────────────────────────────────────────────────────────────');
for (const activity of ACTIVITIES) {
  w(`insert into public.activities (slug, name, description, category, duration_minutes, slots)
values (${q(activity.slug)}, ${json(activity.name)}, ${json(activity.description)},
        ${q(activity.category)}::activity_category, ${activity.durationMinutes}, ${arr(activity.slots)})
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;`);
}
w();

w('-- ─── farms: host profile, listing, activities, and an open calendar ─────────');
for (const farm of FARMS) {
  w(`do $$
declare
  v_region uuid;
  v_host uuid;
  v_listing uuid;
begin
  if exists (select 1 from public.listings where slug = ${q(farm.slug)}) then
    return;
  end if;

  select id into v_region from public.regions where slug = ${q(farm.regionSlug)};

  insert into public.host_profiles (
    farm_name, host_name, bio, region_id, district, village, phone, land_acres,
    languages, verification_status, verified_at, hosting_since
  ) values (
    ${json(farm.farmName)}, ${json(farm.hostName)}, ${json(farm.bio)}, v_region,
    ${q(farm.district)}, ${json(farm.village)}, ${q(farm.phone)}, ${farm.landAcres},
    ${arr(farm.languages)}, 'approved', now(), ${farm.hostingSince}
  ) returning id into v_host;

  insert into public.listings (
    host_id, slug, title, description, region_id, district, village, stay_type, scene,
    crops, base_price, max_guests, bedrooms, best_months, lat, lng, status, rating,
    review_count, is_featured, published_at
  ) values (
    v_host, ${q(farm.slug)}, ${json(farm.title)}, ${json(farm.description)}, v_region,
    ${q(farm.district)}, ${json(farm.village)}, ${q(farm.stayType)}, ${q(farm.scene)},
    ${arr(farm.crops)}, ${farm.basePrice}, ${farm.maxGuests}, ${farm.bedrooms},
    ${intArr(farm.bestMonths)}, ${farm.lat}, ${farm.lng}, 'published', ${farm.rating},
    ${farm.reviewCount}, ${farm.featured}, now()
  ) returning id into v_listing;

  insert into public.listing_activities (listing_id, activity_id)
  select v_listing, a.id from public.activities a where a.slug = any(${arr(farm.activities)});

  -- Six months of open dates, so the calendar and the availability check have
  -- something to work with the moment the project is created.
  insert into public.availability (listing_id, date, is_available)
  select v_listing, d::date, true
  from generate_series(current_date, current_date + 180, interval '1 day') d
  on conflict (listing_id, date) do nothing;
end $$;`);
  w();
}

w('-- ─── curated two-day packages ───────────────────────────────────────────────');
const activityBySlug = new Map(ACTIVITIES.map((activity) => [activity.slug, activity]));
for (const pkg of PACKAGES) {
  const itinerary = pkg.itinerary.map((item) => {
    const activity = item.activity ? activityBySlug.get(item.activity) : undefined;
    return {
      day: item.day,
      slot: item.slot,
      time: item.time,
      activity_slug: activity?.slug,
      category: activity?.category,
      title: item.title ?? activity?.name ?? {},
      note: item.note ?? activity?.description ?? {},
    };
  });

  w(`insert into public.trip_packages (slug, title, summary, region_id, listing_id, duration_days, price_per_person, itinerary, is_featured, status)
select ${q(pkg.slug)}, ${json(pkg.title)}, ${json(pkg.summary)}, r.id, l.id, 2,
       ${pkg.pricePerPerson}, ${json(itinerary)}, ${pkg.featured}, 'published'
from public.regions r
join public.listings l on l.slug = ${q(pkg.listingSlug)}
where r.slug = ${q(pkg.regionSlug)}
on conflict (slug) do update set
  title = excluded.title, summary = excluded.summary, itinerary = excluded.itinerary,
  price_per_person = excluded.price_per_person, is_featured = excluded.is_featured;`);
  w();
}

w('-- ─── reviews, each on a completed booking ───────────────────────────────────');
w('-- A review cannot exist without a booking that finished — the policy in');
w('-- 20260907090200_rls.sql refuses one — so the seed creates the stay first.');
w();
for (const [index, review] of REVIEWS.entries()) {
  const code = `CTN-SEED${String(index + 1).padStart(2, '0')}`;
  w(`do $$
declare
  v_listing uuid;
  v_price numeric;
  v_booking uuid;
  v_start date := current_date - ${review.daysAgo};
begin
  if exists (select 1 from public.bookings where code = ${q(code)}) then
    return;
  end if;

  select id, base_price into v_listing, v_price from public.listings where slug = ${q(review.listingSlug)};
  if v_listing is null then return; end if;

  insert into public.bookings (
    code, listing_id, start_date, end_date, guest_count, guest_name, guest_phone,
    language, total_amount, farmer_amount, platform_fee, status, payment_status
  ) values (
    ${q(code)}, v_listing, v_start, v_start + 2, 2, ${q(review.guest)}, ${q(review.phone)},
    'en', v_price * 2, 0, 0, 'completed', 'paid'
  ) returning id into v_booking;

  insert into public.reviews (booking_id, listing_id, rating, comment, created_at)
  values (v_booking, v_listing, ${review.rating}, ${json(review.comment)}, now() - interval '${review.daysAgo} days');
end $$;`);
  w();
}

w('-- ─── demo rating counts ─────────────────────────────────────────────────────');
w('-- The trigger on reviews keeps rating and review_count true to the reviews in');
w('-- the table. The seed carries a handful of reviews but the farms are written');
w('-- as if they had been hosting for two years, so the counts are restored here.');
w('-- Delete this block for a project that should only ever show real numbers.');
for (const farm of FARMS) {
  w(`update public.listings set rating = ${farm.rating}, review_count = ${farm.reviewCount} where slug = ${q(farm.slug)};`);
}
w();

writeFileSync(out, `${lines.join('\n')}\n`, 'utf8');
console.log(`supabase/seed.sql — ${lines.length} lines, ${REGIONS.length} vibhags, ${ACTIVITIES.length} activities, ${FARMS.length} farms, ${PACKAGES.length} packages, ${REVIEWS.length} reviews`);
