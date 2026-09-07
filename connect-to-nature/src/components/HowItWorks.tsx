'use client';

import { useIntl } from '@/i18n/provider';
import { Reveal } from './ui/Reveal';
import { revealDelay } from '@/lib/stagger';

export function HowItWorks() {
  const { t } = useIntl();
  const steps = [
    { title: t('how.s1'), body: t('how.s1sub') },
    { title: t('how.s2'), body: t('how.s2sub') },
    { title: t('how.s3'), body: t('how.s3sub') },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {steps.map((step, index) => (
        <Reveal key={step.title} delay={revealDelay(index)}>
          <div className="card h-full p-7">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-leaf-soft)] text-sm font-semibold text-[var(--color-leaf)]">
              {index + 1}
            </span>
            <h3 className="mt-5 text-[17px] font-semibold tracking-tight">{step.title}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-muted)]">{step.body}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
