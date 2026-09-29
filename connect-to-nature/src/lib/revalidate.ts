import { revalidateTag } from 'next/cache';
import { TAGS } from './supabase/catalogue';

/* Writes that change what the public sees drop the cached reads immediately,
   so an approved farm appears on the next request rather than up to five
   minutes later. Called from the API routes that make those writes. */

export function revalidateListings(slug?: string) {
  revalidateTag(TAGS.listings);
  revalidateTag(TAGS.regions); // a published farm changes a vibhag's count
  if (slug) revalidateTag(TAGS.listing(slug));
}

export function revalidateRegions() {
  revalidateTag(TAGS.regions);
}

export function revalidatePackages() {
  revalidateTag(TAGS.packages);
}
