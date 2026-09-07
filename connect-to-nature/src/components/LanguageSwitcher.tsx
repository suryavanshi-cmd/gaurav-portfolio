'use client';

import { LOCALES, LOCALE_META, type Locale } from '@/i18n/config';
import { useIntl } from '@/i18n/provider';
import { SegmentedControl } from './ui/SegmentedControl';

/* Switching language re-renders the tree from dictionaries already in memory —
   no navigation, no reload, no lost form state. The cookie it writes is what
   makes the next server render start in the same language. */
export function LanguageSwitcher({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const { locale, setLocale, t } = useIntl();

  return (
    <SegmentedControl<Locale>
      ariaLabel={t('nav.language')}
      size={size}
      value={locale}
      onChange={setLocale}
      segments={LOCALES.map((code) => ({ value: code, label: LOCALE_META[code].short }))}
    />
  );
}
