import { HostLeadForm } from '@/components/host/HostLeadForm';
import { Reveal } from '@/components/ui/Reveal';
import { HostPromise, HostStepList } from '@/components/host/HostPromise';
import { getRegions } from '@/lib/queries';
import { revealDelay } from '@/lib/stagger';

export default async function ShetkariHome() {
  const regions = await getRegions();

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6">
      <HostPromise />

      <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <Reveal delay={revealDelay(1)}>
          <HostLeadForm regions={regions} />
        </Reveal>
        <Reveal delay={revealDelay(2)}>
          <div className="card h-full p-6 sm:p-8">
            <HostStepList />
          </div>
        </Reveal>
      </div>
    </div>
  );
}
