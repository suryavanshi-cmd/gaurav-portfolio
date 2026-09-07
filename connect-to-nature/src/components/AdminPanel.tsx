'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useIntl } from '@/i18n/provider';
import { Pill } from './ui/Field';
import { Scene } from './Scene';
import type { HostProfile, Listing, Region } from '@/lib/types';
import type { AdminStats, HostLead } from '@/lib/admin-queries';
import { DISTRICT_NAMES } from '@/lib/seed-content';

export function AdminPanel({
  stats,
  pending,
  leads,
  regions,
  demo,
}: {
  stats: AdminStats;
  pending: { host: HostProfile; listing: Listing | null }[];
  leads: HostLead[];
  regions: Region[];
  demo: boolean;
}) {
  const { t, tx, money, date } = useIntl();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [decided, setDecided] = useState<Record<string, 'approve' | 'reject'>>({});

  async function decide(hostId: string, listingId: string | undefined, decision: 'approve' | 'reject') {
    setBusy(hostId);
    if (!demo) {
      await fetch('/api/admin/hosts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId, listingId, decision }),
      });
      router.refresh();
    }
    setDecided((current) => ({ ...current, [hostId]: decision }));
    setBusy(null);
  }

  const cards = [
    { label: t('admin.statFarms'), value: String(stats.farms) },
    { label: t('admin.statBookings'), value: String(stats.bookings) },
    { label: t('admin.statGmv'), value: money(stats.gmv) },
    { label: t('admin.statPayouts'), value: money(stats.owed) },
  ];

  return (
    <div className="space-y-14">
      <section>
        <h1 className="text-[clamp(1.7rem,4vw,2.4rem)] font-semibold tracking-[-0.03em]">{t('admin.title')}</h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="card p-5">
              <p className="text-[13px] text-[var(--color-muted)]">{card.label}</p>
              <p className="mt-2 text-[26px] font-semibold tabular-nums tracking-tight">{card.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-5 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
          {t('admin.pendingHosts')}
        </h2>
        {pending.length === 0 ? (
          <p className="card p-6 text-[15px] text-[var(--color-muted)]">{t('admin.noPending')}</p>
        ) : (
          <ul className="space-y-4">
            {pending.map(({ host, listing }) => (
              <motion.li key={host.id} layout className="card overflow-hidden sm:flex">
                <div className="h-32 w-full shrink-0 sm:h-auto sm:w-48">
                  <Scene scene={listing?.scene ?? 'orchard'} seed={host.id} className="h-full w-full" />
                </div>
                <div className="flex-1 p-5">
                  <p className="text-[17px] font-semibold">{tx(host.farm_name)}</p>
                  <p className="mt-1 text-[14px] text-[var(--color-muted)]">
                    {tx(host.host_name)} · {tx(host.village)}, {tx(DISTRICT_NAMES[host.district]) || host.district} · {host.phone}
                  </p>
                  {listing && (
                    <p className="mt-2 text-[14px] text-[var(--color-ink-2)]">
                      {tx(listing.title)} · {money(listing.base_price)}
                    </p>
                  )}

                  {decided[host.id] ? (
                    <Pill tone={decided[host.id] === 'approve' ? 'leaf' : 'warn'}>
                      {t(`status.${decided[host.id] === 'approve' ? 'approved' : 'rejected'}`)}
                    </Pill>
                  ) : (
                    <div className="mt-4 flex gap-3">
                      <button
                        type="button"
                        disabled={busy === host.id}
                        onClick={() => decide(host.id, listing?.id, 'approve')}
                        className="btn btn-primary text-sm"
                      >
                        {t('admin.approve')}
                      </button>
                      <button
                        type="button"
                        disabled={busy === host.id}
                        onClick={() => decide(host.id, listing?.id, 'reject')}
                        className="btn btn-outline text-sm"
                      >
                        {t('admin.reject')}
                      </button>
                    </div>
                  )}
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-5 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
          {t('admin.leads')}
        </h2>
        <div className="card scroll-x">
          <table className="w-full min-w-[560px] text-left text-[14px]">
            <thead className="text-[12px] uppercase tracking-wider text-[var(--color-muted)]">
              <tr>
                <th className="px-5 py-3">{t('host.name')}</th>
                <th className="px-5 py-3">{t('host.phone')}</th>
                <th className="px-5 py-3">{t('host.village')}</th>
                <th className="px-5 py-3">{t('booking.ref')}</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t border-[var(--color-line)]">
                  <td className="px-5 py-3">{lead.name}</td>
                  <td className="px-5 py-3">
                    <a href={`tel:${lead.phone.replace(/\s/g, '')}`} className="underline underline-offset-4">{lead.phone}</a>
                  </td>
                  <td className="px-5 py-3 text-[var(--color-muted)]">
                    {[lead.village, lead.district].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-5 py-3 text-[var(--color-muted)]">{lead.code} · {date(lead.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-5 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
          {t('admin.regions')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {regions.map((region) => (
            <div key={region.id} className="card flex items-center gap-4 p-4">
              <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xl">
                <Scene scene={region.hero_scene} seed={region.slug} className="h-full w-full" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium">{tx(region.name)}</p>
                <p className="truncate text-[13px] text-[var(--color-muted)]">
                  {region.slug} · {(region.districts ?? []).length} {t('regions.districts')}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-[var(--color-muted)]">
          POST /api/admin/regions
        </p>
      </section>
    </div>
  );
}
