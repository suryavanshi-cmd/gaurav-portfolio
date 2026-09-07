import { PackageCard } from '@/components/PackageCard';
import { SectionHeader } from '@/components/SectionHeader';
import { Reveal } from '@/components/ui/Reveal';
import { getPackages } from '@/lib/queries';
import { revealDelay } from '@/lib/stagger';

export default async function PackagesPage() {
  const packages = await getPackages();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6">
      <SectionHeader titleKey="packages.title" subKey="packages.sub" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg, index) => (
          <Reveal key={pkg.id} delay={revealDelay(index)}>
            <PackageCard pkg={pkg} />
          </Reveal>
        ))}
      </div>
    </div>
  );
}
