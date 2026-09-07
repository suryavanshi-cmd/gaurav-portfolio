'use client';

import Link from 'next/link';
import { useIntl } from '@/i18n/provider';
import { Reveal } from '../ui/Reveal';
import { FieldBackdrop } from '../FieldBackdrop';
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
        {/* Layered explicitly rather than with a negative z-index: .card paints
            its own background, and a child behind it is a child nobody sees. */}
        <section className="relative overflow-hidden rounded-[28px] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)]">
          <div className="absolute inset-x-0 bottom-0 z-0 h-3/5" aria-hidden="true">
            <FieldBackdrop className="h-full w-full" density={0.65} />
          </div>
          <div className="relative z-10 p-7 pb-40 sm:p-10 sm:pb-44">
            <h1 className="max-w-2xl text-[clamp(1.9rem,4.6vw,2.9rem)] font-semibold leading-tight tracking-[-0.03em]">
              {t('host.heroTitle')}
            </h1>
            <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-[var(--color-ink-2)]">{t('host.heroSub')}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/shetkari/onboarding" className="btn btn-primary px-7 py-4 text-[17px]">
                {t('host.start')}
              </Link>
              <Link href="/shetkari/signin" className="btn btn-outline bg-[color-mix(in_srgb,var(--color-surface)_75%,transparent)] px-7 py-4 text-[17px] backdrop-blur-md">
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
