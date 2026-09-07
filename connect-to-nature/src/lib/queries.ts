/* Every read the pages do, in one file, each with the same shape: ask Supabase
   if there is a project, fall back to the seed rows if there is not. Keeping
   the fallback here rather than in the pages means a page never has to know
   which mode it is running in. */

import { isSupabaseConfigured } from './env';
import { createServerSupabase } from './supabase/server';
import {
  demoActivities, demoBookings, demoListings, demoPackages, demoRegions,
  demoReviewsFor, findDemoListing, findDemoPackage,
} from './demo-data';
import { filterListings, type ListingFilters } from './filters';
import type { Activity, Booking, Listing, Region, Review, TripPackage } from './types';

export type { ListingFilters } from './filters';
export { filterListings } from './filters';

const LISTING_SELECT = `
  *,
  host:host_profiles(*),
  region:regions(*),
  photos:listing_photos(id, url, alt, position),
  listing_activities(activity:activities(*))
`;

type RawListing = Listing & { listing_activities?: { activity: Activity }[] };

function flattenListing(row: RawListing): Listing {
  const activities = (row.listing_activities ?? [])
    .map((entry) => entry.activity)
    .filter(Boolean);
  const { listing_activities: _ignored, ...listing } = row;
  return {
    ...listing,
    activities,
    photos: (row.photos ?? []).slice().sort((a, b) => a.position - b.position),
  };
}

export async function getRegions(): Promise<Region[]> {
  if (!isSupabaseConfigured) return demoRegions;
  const supabase = await createServerSupabase();
  if (!supabase) return demoRegions;

  const { data, error } = await supabase
    .from('regions')
    .select('*, listings(count)')
    .eq('is_active', true)
    .order('sort_order');
  if (error || !data) return demoRegions;

  return data.map((row: Region & { listings?: { count: number }[] }) => ({
    ...row,
    listing_count: row.listings?.[0]?.count ?? 0,
  }));
}

export async function getActivities(): Promise<Activity[]> {
  if (!isSupabaseConfigured) return demoActivities;
  const supabase = await createServerSupabase();
  if (!supabase) return demoActivities;
  const { data, error } = await supabase.from('activities').select('*').order('slug');
  return error || !data ? demoActivities : (data as Activity[]);
}

export async function getListings(filters: ListingFilters = {}): Promise<Listing[]> {
  let listings: Listing[];

  if (!isSupabaseConfigured) {
    listings = demoListings;
  } else {
    const supabase = await createServerSupabase();
    if (!supabase) {
      listings = demoListings;
    } else {
      const { data, error } = await supabase
        .from('listings')
        .select(LISTING_SELECT)
        .eq('status', 'published');
      listings = error || !data ? demoListings : (data as RawListing[]).map(flattenListing);
    }
  }

  return filterListings(listings, filters);
}

export async function getListing(slug: string): Promise<Listing | null> {
  if (!isSupabaseConfigured) return findDemoListing(slug) ?? null;
  const supabase = await createServerSupabase();
  if (!supabase) return findDemoListing(slug) ?? null;

  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return findDemoListing(slug) ?? null;
  return flattenListing(data as RawListing);
}

export async function getPackages(regionSlug?: string): Promise<TripPackage[]> {
  let packages: TripPackage[];
  if (!isSupabaseConfigured) {
    packages = demoPackages;
  } else {
    const supabase = await createServerSupabase();
    if (!supabase) {
      packages = demoPackages;
    } else {
      const { data, error } = await supabase
        .from('trip_packages')
        .select('*, region:regions(*), listing:listings(*, host:host_profiles(*), region:regions(*))')
        .eq('status', 'published');
      packages = error || !data ? demoPackages : (data as TripPackage[]);
    }
  }
  return regionSlug ? packages.filter((pkg) => pkg.region?.slug === regionSlug) : packages;
}

export async function getPackage(slug: string): Promise<TripPackage | null> {
  if (!isSupabaseConfigured) return findDemoPackage(slug) ?? null;
  const supabase = await createServerSupabase();
  if (!supabase) return findDemoPackage(slug) ?? null;
  const { data, error } = await supabase
    .from('trip_packages')
    .select('*, region:regions(*), listing:listings(*, host:host_profiles(*), region:regions(*))')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return findDemoPackage(slug) ?? null;
  return data as TripPackage;
}

export async function getReviews(listingId: string): Promise<Review[]> {
  if (!isSupabaseConfigured) return demoReviewsFor(listingId);
  const supabase = await createServerSupabase();
  if (!supabase) return demoReviewsFor(listingId);
  // guest_name is denormalised onto the review by a trigger, because bookings
  // are not readable by the visitor a review is public for.
  const { data, error } = await supabase
    .from('reviews')
    .select('id, booking_id, listing_id, rating, comment, created_at, guest_name')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error || !data) return demoReviewsFor(listingId);
  return data as Review[];
}

export async function getMyBookings(): Promise<Booking[]> {
  if (!isSupabaseConfigured) return demoBookings;
  const supabase = await createServerSupabase();
  if (!supabase) return demoBookings;
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];
  const { data, error } = await supabase
    .from('bookings')
    .select('*, listing:listings(*, host:host_profiles(*), region:regions(*))')
    .eq('traveler_id', userData.user.id)
    .order('start_date', { ascending: false });
  return error || !data ? [] : (data as Booking[]);
}
