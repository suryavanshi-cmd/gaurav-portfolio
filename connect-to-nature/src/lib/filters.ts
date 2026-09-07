/* Pure listing filters, shared by the server (which applies them to rows out of
   PostgREST) and by the explore page in the browser (which re-applies them as
   the traveller drags the price slider, without a round trip). Kept out of
   queries.ts so importing it into a client component does not drag next/headers
   along with it. */

import type { Listing } from './types';

export interface ListingFilters {
  regionSlug?: string;
  category?: string;
  maxPrice?: number;
  guests?: number;
  query?: string;
  sort?: 'picked' | 'price' | 'rating';
}

/* Filtering runs in one place for both modes: PostgREST could do most of it,
   but the text search spans three languages inside jsonb and the activity
   filter spans a join, and one predictable implementation beats two that drift. */
export function filterListings(listings: Listing[], filters: ListingFilters): Listing[] {
  const needle = filters.query?.trim().toLowerCase() ?? '';

  const result = listings.filter((listing) => {
    if (filters.regionSlug && listing.region?.slug !== filters.regionSlug) return false;
    if (filters.maxPrice && listing.base_price > filters.maxPrice) return false;
    if (filters.guests && listing.max_guests < filters.guests) return false;
    if (filters.category && !(listing.activities ?? []).some((a) => a.category === filters.category)) return false;
    if (needle) {
      const haystack = [
        listing.title, listing.village, listing.description,
        listing.host?.host_name, listing.host?.farm_name,
      ]
        .flatMap((field) => (field ? Object.values(field) : []))
        .concat(listing.district, listing.crops)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  switch (filters.sort) {
    case 'price':
      return result.slice().sort((a, b) => a.base_price - b.base_price);
    case 'rating':
      return result.slice().sort((a, b) => b.rating - a.rating);
    default:
      return result.slice().sort((a, b) => {
        if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
        return b.rating - a.rating;
      });
  }
}

