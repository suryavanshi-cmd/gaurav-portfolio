'use client';

import Link from 'next/link';
import { useIntl } from '@/i18n/provider';
import { Reveal } from './ui/Reveal';
import { Scene } from './Scene';

export function HostCta() {
  const { t } = useIntl();

  return (
    <Reveal>
      <div className="card relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-70">
          <Scene scene="vineyard" seed="host-cta" className="h-full w-full" />
        </div>
        <div className="bg-[color-mix(in_srgb,var(--color-surface)_82%,transparent)] p-8 backdrop-blur-xl sm:p-12">
          <h2 className="max-w-xl text-[clamp(1.5rem,3vw,2.2rem)] font-semibold tracking-[-0.025em]">
            {t('host.heroTitle')}
          </h2>
          <p className="measure mt-3 text-[15px] leading-relaxed text-[var(--color-ink-2)]">{t('host.heroSub')}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/shetkari" className="btn btn-primary text-sm">
              {t('host.start')}
            </Link>
            <Link href="/shetkari/dashboard" className="btn btn-outline text-sm">
              {t('host.dashboard')}
            </Link>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
