/* Every public read the pages do.
 *
 * Three things are true of all of them: the columns are named rather than
 * starred, the result is cached under a tag, and a failure falls back to the
 * seed rows instead of an error page.
 *
 * Naming the columns is not only about payload. host_profiles is publicly
 * readable because a farm page shows the family's name, but the same row holds
 * their UPI id, bank IFSC and phone number; those columns are not granted to
 * anon (see 20260919120000_host_private_columns.sql), and a `*` here would now
 * fail rather than quietly ship them. */

import { unstable_cache } from 'next/cache';
import { isSupabaseConfigured } from './env';
import { CATALOGUE_REVALIDATE_SECONDS, TAGS, catalogueClient, mustRead, orFallback, readOr } from './supabase/catalogue';
import { createServerSupabase } from './supabase/server';
import {
  demoActivities, demoBookings, demoListings, demoPackages, demoRegions,
  demoReviewsFor, findDemoListing, findDemoPackage,
} from './demo-data';
import { filterListings, type ListingFilters } from './filters';
import { demoLedger } from './payments';
import type { Activity, Booking, Listing, Region, Review, TripPackage } from './types';

export type { ListingFilters } from './filters';
export { filterListings } from './filters';

/* What a visitor is allowed to know about a host. */
const HOST_PUBLIC = 'id, farm_name, host_name, bio, region_id, district, village, land_acres, languages, verification_status, hosting_since';

const LISTING_COLUMNS =
  'id, host_id, slug, title, description, region_id, district, village, stay_type, scene, crops, ' +
  'base_price, max_guests, bedrooms, best_months, lat, lng, status, rating, review_count, is_featured';

const LISTING_SELECT = `
  ${LISTING_COLUMNS},
  host:host_profiles(${HOST_PUBLIC}),
  region:regions(*),
  photos:listing_photos(id, url, alt, position),
  listing_activities(activity:activities(*))
`;

/* The farm page wants its reviews too, and a second round trip for eight rows
   is a round trip spent on nothing. */
const LISTING_DETAIL_SELECT = `
  ${LISTING_SELECT},
  reviews(id, booking_id, listing_id, rating, comment, created_at, guest_name)
`;

type RawListing = Listing & {
  listing_activities?: { activity: Activity }[];
  reviews?: Review[];
};

function flattenListing(row: RawListing): Listing & { reviews?: Review[] } {
  const activities = (row.listing_activities ?? []).map((entry) => entry.activity).filter(Boolean);
  const { listing_activities: _ignored, ...listing } = row;
  return {
    ...listing,
    activities,
    photos: (row.photos ?? []).slice().sort((a, b) => a.position - b.position),
    reviews: (row.reviews ?? []).slice().sort((a, b) => b.created_at.localeCompare(a.created_at)),
  };
}

/* ─── the catalogue, cached ──────────────────────────────────────────────── */

const fetchRegions = unstable_cache(
  async (): Promise<Region[]> => {
    const supabase = catalogueClient();
    if (!supabase) return demoRegions;
    const rows = await mustRead<(Region & { listings?: { count: number }[] })[]>('regions', () =>
      supabase
        .from('regions')
        .select('*, listings(count)')
        .eq('is_active', true)
        .order('sort_order'));
    return rows.map((row) => ({ ...row, listing_count: row.listings?.[0]?.count ?? 0 }));
  },
  ['ctn-regions'],
  { revalidate: CATALOGUE_REVALIDATE_SECONDS, tags: [TAGS.regions] },
);

const fetchActivities = unstable_cache(
  async (): Promise<Activity[]> => {
    const supabase = catalogueClient();
    if (!supabase) return demoActivities;
    return mustRead<Activity[]>('activities', () => supabase.from('activities').select('*').order('slug'));
  },
  ['ctn-activities'],
  { revalidate: CATALOGUE_REVALIDATE_SECONDS, tags: [TAGS.activities] },
);

const fetchListings = unstable_cache(
  async (): Promise<Listing[]> => {
    const supabase = catalogueClient();
    if (!supabase) return demoListings;
    const rows = await mustRead<RawListing[]>('listings', () =>
      supabase.from('listings').select(LISTING_SELECT).eq('status', 'published'));
    return rows.map(flattenListing);
  },
  ['ctn-listings'],
  { revalidate: CATALOGUE_REVALIDATE_SECONDS, tags: [TAGS.listings] },
);

const fetchListing = unstable_cache(
  async (slug: string): Promise<(Listing & { reviews?: Review[] }) | null> => {
    const supabase = catalogueClient();
    if (!supabase) return findDemoListing(slug) ?? null;
    const row = await mustRead<RawListing>('listing', () =>
      supabase.from('listings').select(LISTING_DETAIL_SELECT).eq('slug', slug).maybeSingle());
    return flattenListing(row);
  },
  ['ctn-listing'],
  { revalidate: CATALOGUE_REVALIDATE_SECONDS, tags: [TAGS.listings] },
);

const fetchPackages = unstable_cache(
  async (): Promise<TripPackage[]> => {
    const supabase = catalogueClient();
    if (!supabase) return demoPackages;
    return mustRead<TripPackage[]>('packages', () =>
      supabase
        .from('trip_packages')
        .select(`*, region:regions(*), listing:listings(${LISTING_COLUMNS}, host:host_profiles(${HOST_PUBLIC}), region:regions(*))`)
        .eq('status', 'published'));
  },
  ['ctn-packages'],
  { revalidate: CATALOGUE_REVALIDATE_SECONDS, tags: [TAGS.packages] },
);

/* ─── what the pages call ────────────────────────────────────────────────── */

export async function getRegions(): Promise<Region[]> {
  return orFallback('regions', fetchRegions, demoRegions);
}

export async function getActivities(): Promise<Activity[]> {
  return orFallback('activities', fetchActivities, demoActivities);
}

export async function getListings(filters: ListingFilters = {}): Promise<Listing[]> {
  const listings = await orFallback('listings', fetchListings, demoListings);
  return filterListings(listings, filters);
}

export async function getListing(slug: string): Promise<(Listing & { reviews?: Review[] }) | null> {
  return orFallback('listing', () => fetchListing(slug), findDemoListing(slug) ?? null);
}

export async function getPackages(regionSlug?: string): Promise<TripPackage[]> {
  const packages = await orFallback('packages', fetchPackages, demoPackages);
  return regionSlug ? packages.filter((pkg) => pkg.region?.slug === regionSlug) : packages;
}

export async function getPackage(slug: string): Promise<TripPackage | null> {
  if (!isSupabaseConfigured) return findDemoPackage(slug) ?? null;
  const packages = await orFallback('packages', fetchPackages, demoPackages);
  return packages.find((pkg) => pkg.slug === slug) ?? findDemoPackage(slug) ?? null;
}

/* Reviews arrive embedded in the farm page's single query. This stays for
   anything that has only a listing id, and for demo mode. */
export async function getReviews(listingId: string): Promise<Review[]> {
  if (!isSupabaseConfigured) return demoReviewsFor(listingId);
  const supabase = catalogueClient();
  if (!supabase) return demoReviewsFor(listingId);
  return readOr('reviews', () =>
    supabase
      .from('reviews')
      .select('id, booking_id, listing_id, rating, comment, created_at, guest_name')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false })
      .limit(20), demoReviewsFor(listingId));
}

/* Other farms in the same vibhag, for the bottom of a farm page. Previously
   this pulled the whole catalogue to keep three rows. */
export async function getSimilarListings(regionId: string, excludeId: string, limit = 3): Promise<Listing[]> {
  const all = await orFallback('listings', fetchListings, demoListings);
  return all.filter((item) => item.region_id === regionId && item.id !== excludeId).slice(0, limit);
}

/* ─── a traveller's own rows: never cached, always their session ─────────── */

export async function getMyBookings(): Promise<Booking[]> {
  if (!isSupabaseConfigured) return demoBookings.map((booking) => ({ ...booking, ...demoLedger(booking) }));
  const supabase = await createServerSupabase();
  if (!supabase) return demoBookings;
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const base = `*, listing:listings(${LISTING_COLUMNS}, host:host_profiles(${HOST_PUBLIC}), region:regions(*))`;
  const query = (columns: string) =>
    supabase
      .from('bookings')
      .select(columns)
      .eq('traveler_id', userData.user.id)
      .order('start_date', { ascending: false });

  // Each booking with its payments and its payment log. If the ledger is not
  // in this database yet — the code can be deployed before the migration is
  // applied — the trips are still worth showing without it.
  const withLedger = await query(`${base}, payments(*), payment_events(*)`)
    .order('created_at', { referencedTable: 'payments', ascending: false })
    .order('id', { referencedTable: 'payment_events', ascending: true });
  if (!withLedger.error && withLedger.data) return withLedger.data as unknown as Booking[];

  const { data, error } = await query(base);
  return error || !data ? [] : (data as unknown as Booking[]);
}
