'use client';

import Link from 'next/link';
import { useIntl } from '@/i18n/provider';

export function AdminGate() {
  const { t } = useIntl();
  return (
    <div className="card p-8">
      <h1 className="text-[24px] font-semibold tracking-tight">{t('admin.title')}</h1>
      <p className="mt-3 text-[16px] text-[var(--color-muted)]">{t('admin.onlyAdmin')}</p>
      <Link href="/auth" className="btn btn-primary mt-6">{t('nav.signIn')}</Link>
    </div>
  );
}
