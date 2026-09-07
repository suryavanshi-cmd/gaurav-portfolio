'use client';

import Link from 'next/link';
import { useIntl } from '@/i18n/provider';
import { HostStepList } from './HostPromise';

/* A signed-in farmer with no farm on the platform yet: the dashboard has
   nothing to show, so it shows the way in instead. */
export function NoListingYet() {
  const { t } = useIntl();

  return (
    <div className="card p-8">
      <h1 className="text-[24px] font-semibold tracking-tight">{t('host.heroTitle')}</h1>
      <p className="mt-3 text-[17px] leading-relaxed text-[var(--color-muted)]">{t('host.heroSub')}</p>
      <div className="mt-8">
        <HostStepList />
      </div>
      <Link href="/shetkari" className="btn btn-ghost mt-4 w-full py-3.5 text-[16px]">
        {t('common.back')}
      </Link>
    </div>
  );
}
