'use client';

import Link from 'next/link';
import { useIntl } from '@/i18n/provider';
import { BrandMark } from '../BrandMark';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { ThemeToggle } from '../ThemeToggle';

/* The farmer portal's header, deliberately shorter than the traveller one:
   three destinations, no marketing links, and controls big enough to hit on a
   phone held in one hand in a field. */
export function HostNav({ signedIn }: { signedIn: boolean }) {
  const { t } = useIntl();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[var(--color-surface)]">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="/shetkari" className="flex items-center gap-2 text-[17px] font-semibold">
          <BrandMark className="h-8 w-8" />
          <span>{t('host.portal')}</span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link
            href={signedIn ? '/shetkari/dashboard' : '/shetkari/signin'}
            className="btn btn-primary px-5 py-2.5 text-[15px]"
          >
            {signedIn ? t('host.dashboard') : t('host.signIn')}
          </Link>
        </div>
      </nav>
    </header>
  );
}
