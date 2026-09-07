/* The same rows the SQL seed writes, shaped as they come back from PostgREST,
   served from memory when no Supabase project is configured.

   This exists so the repository is runnable the moment it is cloned — `npm run
   dev` with an empty .env shows the whole product — and so the seed content has
   one home rather than two. Every write path checks isSupabaseConfigured before
   it gets here; in demo mode a booking is echoed back to the caller and not
   stored anywhere. */

import { ACTIVITIES, FARMS, PACKAGES, REGIONS, REVIEWS } from './seed-content';
import type {
  Activity, Booking, HostProfile, ItineraryItem, Listing, Region, Review, TripPackage,
} from './types';

/* A stable uuid for a slug, so demo ids look and behave like database ids and a
   link built in demo mode keeps working across reloads. */
export function stableId(namespace: string, key: string): string {
  const input = `${namespace}:${key}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i += 1) {
    h1 = Math.imul(h1 ^ input.charCodeAt(i), 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (input.charCodeAt(i) + i), 0x85ebca6b) >>> 0;
  }
  const hex = (n: number) => n.toString(16).padStart(8, '0');
  const raw = `${hex(h1)}${hex(h2)}${hex(h1 ^ h2)}${hex((h1 + h2) >>> 0)}`;
  return [raw.slice(0, 8), raw.slice(8, 12), `4${raw.slice(13, 16)}`, `a${raw.slice(17, 20)}`, raw.slice(20, 32)].join('-');
}

export const demoRegions: Region[] = REGIONS.map((region) => ({
  id: stableId('region', region.slug),
  slug: region.slug,
  name: region.name,
  tagline: region.tagline,
  description: region.description,
  districts: region.districts,
  season: region.season,
  reach: region.reach,
  hero_scene: region.heroScene,
  accent: region.accent,
  sort_order: region.sortOrder,
  is_active: true,
  listing_count: FARMS.filter((f) => f.regionSlug === region.slug).length,
}));

export const demoActivities: Activity[] = ACTIVITIES.map((activity) => ({
  id: stableId('activity', activity.slug),
  slug: activity.slug,
  name: activity.name,
  description: activity.description,
  category: activity.category,
  duration_minutes: activity.durationMinutes,
  slots: activity.slots,
}));

const activityBySlug = new Map(demoActivities.map((a) => [a.slug, a]));
const regionBySlug = new Map(demoRegions.map((r) => [r.slug, r]));

export const demoHosts: HostProfile[] = FARMS.map((farm) => ({
  id: stableId('host', farm.slug),
  user_id: null,
  farm_name: farm.farmName,
  host_name: farm.hostName,
  bio: farm.bio,
  region_id: stableId('region', farm.regionSlug),
  district: farm.district,
  village: farm.village,
  phone: farm.phone,
  land_acres: farm.landAcres,
  languages: farm.languages,
  verification_status: 'approved',
  hosting_since: farm.hostingSince,
}));

const hostBySlug = new Map(FARMS.map((farm, index) => [farm.slug, demoHosts[index]]));

export const demoListings: Listing[] = FARMS.map((farm) => ({
  id: stableId('listing', farm.slug),
  host_id: stableId('host', farm.slug),
  slug: farm.slug,
  title: farm.title,
  description: farm.description,
  region_id: stableId('region', farm.regionSlug),
  district: farm.district,
  village: farm.village,
  stay_type: farm.stayType,
  scene: farm.scene,
  crops: farm.crops,
  base_price: farm.basePrice,
  max_guests: farm.maxGuests,
  bedrooms: farm.bedrooms,
  best_months: farm.bestMonths,
  lat: farm.lat,
  lng: farm.lng,
  status: 'published',
  rating: farm.rating,
  review_count: farm.reviewCount,
  is_featured: farm.featured,
  host: hostBySlug.get(farm.slug),
  region: regionBySlug.get(farm.regionSlug),
  photos: [],
  activities: farm.activities
    .map((slug) => activityBySlug.get(slug))
    .filter((a): a is Activity => Boolean(a)),
}));

const listingBySlug = new Map(demoListings.map((l) => [l.slug, l]));

export const demoPackages: TripPackage[] = PACKAGES.map((pkg) => {
  const listing = listingBySlug.get(pkg.listingSlug);
  const itinerary: ItineraryItem[] = pkg.itinerary.map((item) => {
    const activity = item.activity ? activityBySlug.get(item.activity) : undefined;
    return {
      day: item.day,
      slot: item.slot,
      time: item.time,
      activity_id: activity?.id,
      activity_slug: activity?.slug,
      title: item.title ?? activity?.name ?? {},
      note: item.note ?? activity?.description ?? {},
      category: activity?.category,
    };
  });
  return {
    id: stableId('package', pkg.slug),
    slug: pkg.slug,
    title: pkg.title,
    summary: pkg.summary,
    region_id: stableId('region', pkg.regionSlug),
    listing_id: listing?.id ?? null,
    duration_days: 2,
    price_per_person: pkg.pricePerPerson,
    itinerary,
    is_featured: pkg.featured,
    listing,
    region: regionBySlug.get(pkg.regionSlug),
  };
});

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export const demoReviews: Review[] = REVIEWS.map((review, index) => ({
  id: stableId('review', `${review.listingSlug}-${index}`),
  booking_id: stableId('booking', `${review.listingSlug}-${index}`),
  listing_id: stableId('listing', review.listingSlug),
  rating: review.rating,
  comment: review.comment,
  created_at: isoDaysAgo(review.daysAgo),
  guest_name: review.guest,
}));

/* A traveller's trips in demo mode: one stay coming up, one already finished so
   the review form has something to attach to. */
function isoDate(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export const demoBookings: Booking[] = [
  {
    id: stableId('demo-booking', 'upcoming'),
    code: 'CTN-DEMO41',
    traveler_id: null,
    listing_id: demoListings[6].id,
    trip_package_id: demoPackages[2].id,
    itinerary_id: null,
    start_date: isoDate(19),
    end_date: isoDate(21),
    guest_count: 4,
    guest_name: 'Demo traveller',
    guest_phone: '+91 90000 00000',
    guest_note: null,
    language: 'en',
    total_amount: 10800,
    farmer_amount: 9936,
    platform_fee: 864,
    status: 'confirmed',
    payment_status: 'demo',
    created_at: isoDaysAgo(3),
    listing: demoListings[6],
  },
  {
    id: stableId('demo-booking', 'past'),
    code: 'CTN-DEMO18',
    traveler_id: null,
    listing_id: demoListings[0].id,
    trip_package_id: null,
    itinerary_id: null,
    start_date: isoDate(-26),
    end_date: isoDate(-24),
    guest_count: 2,
    guest_name: 'Demo traveller',
    guest_phone: '+91 90000 00000',
    guest_note: null,
    language: 'en',
    total_amount: 4800,
    farmer_amount: 4416,
    platform_fee: 384,
    status: 'completed',
    payment_status: 'demo',
    created_at: isoDaysAgo(40),
    listing: demoListings[0],
  },
];

export function findDemoListing(slug: string): Listing | undefined {
  return listingBySlug.get(slug);
}

export function findDemoPackage(slug: string): TripPackage | undefined {
  return demoPackages.find((pkg) => pkg.slug === slug);
}

export function demoReviewsFor(listingId: string): Review[] {
  return demoReviews.filter((review) => review.listing_id === listingId);
}
