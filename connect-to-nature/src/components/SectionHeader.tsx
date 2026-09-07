'use client';

import Link from 'next/link';
import { useIntl } from '@/i18n/provider';
import { Reveal } from './ui/Reveal';

/* Takes dictionary keys rather than finished strings. A server component that
   rendered the text itself would freeze it in the language of the request, and
   switching language in the header would leave the section titles behind. */
export function SectionHeader({
  titleKey,
  subKey,
  action,
}: {
  titleKey: string;
  subKey?: string;
  action?: { href: string; labelKey: string };
}) {
  const { t } = useIntl();

  return (
    <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-[clamp(1.6rem,3.4vw,2.4rem)] font-semibold tracking-[-0.025em]">{t(titleKey)}</h2>
        {subKey && <p className="measure mt-3 text-[15px] leading-relaxed text-[var(--color-muted)]">{t(subKey)}</p>}
      </div>
      {action && (
        <Link href={action.href} className="btn btn-ghost text-sm">
          {t(action.labelKey)}
        </Link>
      )}
    </Reveal>
  );
}
