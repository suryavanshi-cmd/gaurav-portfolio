import { Hero } from '@/components/Hero';
import { RegionCards } from '@/components/RegionCards';
import { SectionHeader } from '@/components/SectionHeader';
import { ListingCard } from '@/components/ListingCard';
import { PackageCard } from '@/components/PackageCard';
import { HowItWorks } from '@/components/HowItWorks';
import { HostCta } from '@/components/HostCta';
import { Reveal } from '@/components/ui/Reveal';
import { getListings, getPackages, getRegions } from '@/lib/queries';
import { revealDelay } from '@/lib/stagger';

export default async function HomePage() {
  const [regions, listings, packages] = await Promise.all([
    getRegions(),
    getListings({ sort: 'picked' }),
    getPackages(),
  ]);

  const featured = listings.slice(0, 6);
  const featuredPackages = packages.filter((pkg) => pkg.is_featured).slice(0, 3);

  return (
    <>
      <Hero regions={regions} farmCount={listings.length} />

      <section id="regions" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
        <SectionHeader titleKey="regions.title" subKey="regions.sub" />
        <RegionCards regions={regions} />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <SectionHeader
          titleKey="explore.title"
          subKey="explore.sub"
          action={{ href: '/explore', labelKey: 'common.viewAll' }}
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((listing, index) => (
            <Reveal key={listing.id} delay={revealDelay(index)}>
              <ListingCard listing={listing} />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <SectionHeader
          titleKey="packages.title"
          subKey="packages.sub"
          action={{ href: '/packages', labelKey: 'common.viewAll' }}
        />
        <div className="grid gap-6 md:grid-cols-3">
          {featuredPackages.map((pkg, index) => (
            <Reveal key={pkg.id} delay={revealDelay(index)}>
              <PackageCard pkg={pkg} />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <SectionHeader titleKey="how.title" />
        <HowItWorks />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <HostCta />
      </section>
    </>
  );
}
