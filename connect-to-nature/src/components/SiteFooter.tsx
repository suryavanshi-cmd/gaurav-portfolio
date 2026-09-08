'use client';

import Link from 'next/link';
import { useIntl } from '@/i18n/provider';
import { BrandMark } from './BrandMark';
import { LanguageSwitcher } from './LanguageSwitcher';
import { FieldBackdrop } from './FieldBackdrop';

export function SiteFooter({ demo }: { demo: boolean }) {
  const { t } = useIntl();

  return (
    /* Sky at the top of a page, ground at the bottom of it. The footer is where
       the page ends, so the field belongs here on every route — quieter than
       the hero, and behind the links rather than under them. */
    <footer className="relative mt-24 overflow-hidden border-t border-[var(--color-line)] bg-[var(--color-surface-2)]">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-2/3 opacity-70" aria-hidden="true">
        <FieldBackdrop className="h-full w-full" density={0.5} />
      </div>

      <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            <BrandMark />
            {t('common.brand')}
          </div>
          <p className="measure mt-3 text-sm leading-relaxed text-[var(--color-muted)]">{t('footer.line')}</p>
          <div className="mt-5">
            <LanguageSwitcher />
          </div>
        </div>

        <div className="text-sm">
          <div className="mb-3 font-medium">{t('footer.customer')}</div>
          <ul className="space-y-2 text-[var(--color-muted)]">
            <li><Link href="/explore" className="transition hover:text-[var(--color-ink)]">{t('nav.explore')}</Link></li>
            <li><Link href="/packages" className="transition hover:text-[var(--color-ink)]">{t('nav.packages')}</Link></li>
            <li><Link href="/planner" className="transition hover:text-[var(--color-ink)]">{t('nav.planner')}</Link></li>
            <li><Link href="/trips" className="transition hover:text-[var(--color-ink)]">{t('nav.trips')}</Link></li>
          </ul>
        </div>

        <div className="text-sm">
          <div className="mb-3 font-medium">{t('footer.host')}</div>
          <ul className="space-y-2 text-[var(--color-muted)]">
            <li><Link href="/shetkari" className="transition hover:text-[var(--color-ink)]">{t('host.portal')}</Link></li>
            <li><Link href="/shetkari/onboarding" className="transition hover:text-[var(--color-ink)]">{t('host.start')}</Link></li>
            <li><Link href="/shetkari/dashboard" className="transition hover:text-[var(--color-ink)]">{t('host.dashboard')}</Link></li>
            <li><Link href="/admin" className="transition hover:text-[var(--color-ink)]">{t('nav.admin')}</Link></li>
          </ul>
        </div>
      </div>

      <div className="relative z-10 border-t border-[color-mix(in_srgb,var(--color-line)_70%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_70%,transparent)] backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-[var(--color-muted)] sm:px-6">
          {demo && <p className="mb-2">{t('footer.demo')}</p>}
          <p>© {new Date().getFullYear()} {t('common.brand')}. {t('footer.rights')} · {t('common.poweredBy')}</p>
        </div>
      </div>
    </footer>
  );
}
