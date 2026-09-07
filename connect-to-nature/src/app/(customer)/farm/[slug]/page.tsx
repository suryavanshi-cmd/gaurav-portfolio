import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ListingDetail } from '@/components/ListingDetail';
import { getListing, getListings, getReviews } from '@/lib/queries';
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

  const [reviews, all] = await Promise.all([getReviews(listing.id), getListings()]);
  const similar = all
    .filter((item) => item.id !== listing.id && item.region_id === listing.region_id)
    .slice(0, 3);

  return <ListingDetail listing={listing} reviews={reviews} similar={similar} />;
}
