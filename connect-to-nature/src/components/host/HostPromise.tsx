'use client';

import Link from 'next/link';
import { useIntl } from '@/i18n/provider';
import { Reveal } from '../ui/Reveal';
import { Scene } from '../Scene';
import { revealDelay } from '@/lib/stagger';

export function HostPromise() {
  const { t } = useIntl();

  const promises = [
    { title: t('host.p1'), body: t('host.p1sub') },
    { title: t('host.p2'), body: t('host.p2sub') },
    { title: t('host.p3'), body: t('host.p3sub') },
    { title: t('host.p4'), body: t('host.p4sub') },
  ];

  return (
    <>
      <Reveal>
        <section className="card relative overflow-hidden">
          <div className="absolute inset-0 -z-10 opacity-60">
            <Scene scene="orchard" seed="shetkari-hero" className="h-full w-full" />
          </div>
          <div className="bg-[color-mix(in_srgb,var(--color-surface)_84%,transparent)] p-7 backdrop-blur-xl sm:p-10">
            <h1 className="max-w-2xl text-[clamp(1.9rem,4.6vw,2.9rem)] font-semibold leading-tight tracking-[-0.03em]">
              {t('host.heroTitle')}
            </h1>
            <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-[var(--color-ink-2)]">{t('host.heroSub')}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/shetkari/onboarding" className="btn btn-primary px-7 py-4 text-[17px]">
                {t('host.start')}
              </Link>
              <Link href="/shetkari/signin" className="btn btn-outline px-7 py-4 text-[17px]">
                {t('host.signIn')}
              </Link>
            </div>
          </div>
        </section>
      </Reveal>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {promises.map((promise, index) => (
          <Reveal key={promise.title} delay={revealDelay(index)}>
            <div className="card h-full p-6">
              <h2 className="text-[19px] font-semibold tracking-tight">{promise.title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-muted)]">{promise.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </>
  );
}

/* The five steps of onboarding, shown before a farmer starts them, so nobody
   begins a form without knowing how long it is. */
export function HostStepList() {
  const { t } = useIntl();
  const steps = [t('host.step1'), t('host.step2'), t('host.step3'), t('host.step4'), t('host.step5')];

  return (
    <div>
      <h2 className="text-[22px] font-semibold tracking-tight">{t('host.steps')}</h2>
      <ol className="mt-5 space-y-4">
        {steps.map((step, index) => (
          <li key={step} className="flex items-start gap-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-leaf-soft)] text-[15px] font-semibold text-[var(--color-leaf)]">
              {index + 1}
            </span>
            <span className="pt-1.5 text-[16px]">{step}</span>
          </li>
        ))}
      </ol>
      <Link href="/shetkari/onboarding" className="btn btn-primary mt-7 w-full py-4 text-[17px]">
        {t('host.start')}
      </Link>
      <Link href="/shetkari/dashboard" className="btn btn-ghost mt-3 w-full py-4 text-[17px]">
        {t('host.dashboard')}
      </Link>
    </div>
  );
}
