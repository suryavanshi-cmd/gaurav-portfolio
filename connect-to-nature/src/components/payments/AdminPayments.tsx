'use client';

import { Fragment, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import clsx from 'clsx';
import { useIntl } from '@/i18n/provider';
import type { AdminPayment, AdminPaymentEvent } from '@/lib/admin-queries';
import { PaymentLog, PaymentStatusPill, usePaymentFormat } from './PaymentLog';

/* Every payment, and the log behind each one, for the admin.
 *
 * Three views of the same ledger: totals, a table of payments with each row
 * opening to its booking's whole log, and the raw feed of the latest events
 * across every booking — the place to look first when a guest says "I paid
 * and nothing happened". */

const TODAY = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const DAY_OF = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(iso));

export function AdminPayments({
  payments,
  feed,
  demo,
}: {
  payments: AdminPayment[];
  feed: AdminPaymentEvent[];
  demo: boolean;
}) {
  const { t, tx, money } = useIntl();
  const { when, methodLabel, eventLabel, eventDetail } = usePaymentFormat();
  const [open, setOpen] = useState<string | null>(null);

  const succeeded = payments.filter((p) => p.status === 'succeeded');
  const today = TODAY();
  const cards = [
    { label: t('payments.count'), value: String(payments.length) },
    { label: t('payments.collected'), value: money(succeeded.reduce((sum, p) => sum + Number(p.amount), 0)) },
    { label: t('payments.today'), value: String(payments.filter((p) => DAY_OF(p.created_at) === today).length) },
  ];

  const heading = 'mb-5 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]';

  return (
    <section id="payments" className="scroll-mt-24">
      <h2 className={heading}>{t('payments.title')}</h2>

      <p className="mb-5 rounded-2xl bg-[color-mix(in_srgb,var(--color-sun)_14%,transparent)] px-4 py-3 text-[13px] leading-relaxed text-[var(--color-ink-2)]">
        {demo ? t('payments.demoNote') : t('payments.testNote')}
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="card p-5">
            <p className="text-[13px] text-[var(--color-muted)]">{card.label}</p>
            <p className="mt-2 text-[24px] font-semibold tabular-nums tracking-tight">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="card scroll-x mt-6">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead className="text-[12px] text-[var(--color-muted)]">
            <tr className="border-b border-[var(--color-line)]">
              {[t('payments.when'), t('payments.booking'), t('payments.guest'), t('payments.amount'),
                t('payments.method'), t('payments.reference'), ''].map((h, i) => (
                <th key={i} className="px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-[var(--color-muted)]">{t('payments.none')}</td></tr>
            )}
            {payments.map((p) => {
              const isOpen = open === p.id;
              return (
                <Fragment key={p.id}>
                  <tr className="border-b border-[var(--color-line)] last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">{when(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium tracking-wide">{p.booking?.code ?? '—'}</span>
                      {p.booking?.listing && (
                        <span className="block max-w-[14rem] truncate text-[12px] text-[var(--color-muted)]">
                          {tx(p.booking.listing.title)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{p.booking?.guest_name ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums">{money(Number(p.amount))}</td>
                    <td className="px-4 py-3">{methodLabel(p.method)}</td>
                    <td className="px-4 py-3">
                      <span className="block font-mono text-[12px]">{p.reference}</span>
                      <span className="mt-1 block"><PaymentStatusPill payment={p} /></span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : p.id)}
                        aria-expanded={isOpen}
                        className="btn btn-ghost px-3 py-1.5 text-[12px]"
                      >
                        {isOpen ? t('payments.hideLog') : t('payments.showLog')}
                      </button>
                    </td>
                  </tr>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <tr className="border-b border-[var(--color-line)] bg-[var(--color-surface-2)]">
                        <td colSpan={7} className="p-0">
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                            /* Pinned to the visible part of the table: on a
                               phone the table scrolls sideways, and a log that
                               scrolled with it would put the event names off
                               one edge and the times off the other. It is this
                               element that sticks, because the overflow-hidden
                               the height animation needs would trap a sticky
                               child inside it. */
                            className="sticky left-0 max-w-[calc(100vw-2rem)] overflow-hidden sm:max-w-none"
                          >
                            <div className="px-6 py-5">
                              <PaymentLog events={p.booking?.payment_events ?? []} />
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 className={clsx(heading, 'mt-10')}>{t('payments.feed')}</h3>
      <div className="card divide-y divide-[var(--color-line)]">
        {feed.length === 0 && <p className="px-5 py-6 text-[13px] text-[var(--color-muted)]">{t('payments.noFeed')}</p>}
        {feed.map((e) => {
          const detail = eventDetail(e);
          return (
            <div key={e.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3 text-[13px]">
              <time dateTime={e.created_at} className="w-36 shrink-0 tabular-nums text-[var(--color-muted)]">
                {when(e.created_at, true)}
              </time>
              <span className="w-28 shrink-0 font-medium tracking-wide">{e.booking?.code ?? '—'}</span>
              <span className="font-medium">{eventLabel(e.event)}</span>
              {detail && <span className="text-[var(--color-muted)]">{detail}</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
