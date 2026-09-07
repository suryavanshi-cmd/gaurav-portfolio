import { ExploreClient } from '@/components/ExploreClient';
import { SectionHeader } from '@/components/SectionHeader';
import { getListings, getRegions } from '@/lib/queries';

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; activity?: string }>;
}) {
  const params = await searchParams;
  const [listings, regions] = await Promise.all([getListings(), getRegions()]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6">
      <SectionHeader titleKey="explore.title" subKey="explore.sub" />
      <ExploreClient
        listings={listings}
        regions={regions}
        initialRegion={params.region}
        initialCategory={params.activity}
      />
    </div>
  );
}
