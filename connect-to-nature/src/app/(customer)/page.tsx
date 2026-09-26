import { Hero } from '@/components/Hero';
import { RegionCards } from '@/components/RegionCards';
import { SectionHeader } from '@/components/SectionHeader';
import { ListingCard } from '@/components/ListingCard';
import { PackageCard } from '@/components/PackageCard';
import { HowItWorks } from '@/components/HowItWorks';
import { HostCta } from '@/components/HostCta';
import { Reveal } from '@/components/ui/Reveal';
import { LocalNav } from '@/components/story/LocalNav';
import { Highlights } from '@/components/story/Highlights';
import { WordReveal } from '@/components/story/WordReveal';
import { GrowPhoto } from '@/components/story/GrowPhoto';
import { DayTabs } from '@/components/story/DayTabs';
import { getListings, getPackages, getRegions } from '@/lib/queries';
import { revealDelay } from '@/lib/stagger';

/* The front page is told in two halves, the way a product page is: a dark
   band that is about the place — the reel, the highlights, the coast opening
   out, one day hour by hour — and then the light half that is about booking
   it. Every section declares its tone so the sticky section bar can match
   whatever it is floating over. */
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
      <div id="top" className="theme-dark">
        <Hero regions={regions} farmCount={listings.length} />
      </div>

      <LocalNav />

      <div className="theme-dark">
        <Highlights />
        <WordReveal textKey="story.statement" />
        <GrowPhoto />
        <DayTabs />
      </div>

      <section id="regions" data-tone="light" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-20 sm:px-6 sm:py-28">
        <SectionHeader titleKey="regions.title" subKey="regions.sub" />
        <RegionCards regions={regions} />
      </section>

      <section id="farms" data-tone="light" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-8 sm:px-6">
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

      <section id="trips" data-tone="light" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-20 sm:px-6 sm:py-28">
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

      <section data-tone="light" className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <SectionHeader titleKey="how.title" />
        <HowItWorks />
      </section>

      <section data-tone="light" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <HostCta />
      </section>
    </>
  );
}
