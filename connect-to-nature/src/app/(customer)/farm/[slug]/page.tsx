import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ListingDetail } from '@/components/ListingDetail';
import { getListing, getSimilarListings } from '@/lib/queries';
import { getLocale } from '@/i18n/server';
import { pickText } from '@/i18n/dictionaries';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [listing, locale] = await Promise.all([getListing(slug), getLocale()]);
  if (!listing) return {};
  return {
    title: pickText(listing.title, locale),
    description: pickText(listing.description, locale).slice(0, 180),
  };
}

export default async function FarmPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const listing = await getListing(slug);
  if (!listing) notFound();

  // The reviews came back with the farm; similar farms come off the cached
  // catalogue. This page used to make three round trips, one of which pulled
  // every listing in order to keep three of them.
  const similar = await getSimilarListings(listing.region_id, listing.id);

  return <ListingDetail listing={listing} reviews={listing.reviews ?? []} similar={similar} />;
}
