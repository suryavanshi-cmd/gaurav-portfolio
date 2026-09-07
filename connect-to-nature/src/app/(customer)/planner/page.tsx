import { PlannerWizard } from '@/components/PlannerWizard';
import { getListings, getRegions } from '@/lib/queries';

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ farm?: string }>;
}) {
  const params = await searchParams;
  const [listings, regions] = await Promise.all([getListings(), getRegions()]);
  return <PlannerWizard listings={listings} regions={regions} preferredFarm={params.farm} />;
}
