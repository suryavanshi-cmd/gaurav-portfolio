'use client';

import clsx from 'clsx';
import { useIntl } from '@/i18n/provider';
import { KNOWN_EVENTS } from '@/lib/payments';
import type { Payment, PaymentEvent } from '@/lib/types';

/* Payment times are shown in India time whoever is looking, and on the server
   too. Leaving the zone to the browser would print a different string on the
   server (UTC) than in the page (IST) and break hydration — and a log is only
   useful if everyone reading it sees the same clock. */
const ZONE = 'Asia/Kolkata';
const LOCALE_TAG: Record<string, string> = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };

export function usePaymentFormat() {
  const { t, locale, money } = useIntl();
  const tag = LOCALE_TAG[locale] ?? 'en-IN';

  const when = (iso: string, withSeconds = false) =>
    new Intl.DateTimeFormat(tag, {
      timeZone: ZONE,
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      ...(withSeconds ? { second: '2-digit' } : {}),
    }).format(new Date(iso));

  const eventLabel = (event: string) =>
    (KNOWN_EVENTS as readonly string[]).includes(event) ? t(`payments.events.${event.replace(/\./g, '_')}`) : event;

  const methodLabel = (method: string | null | undefined) =>
    method === 'upi' || method === 'card' || method === 'netbanking' ? t(`booking.${method}`) : '—';

  /* The one line of detail worth showing beside an event. */
  const eventDetail = (event: PaymentEvent) => {
    const d = event.detail ?? {};
    const parts: string[] = [];
    if (typeof d.method === 'string') parts.push(methodLabel(d.method));
    if (typeof d.amount === 'number' || typeof d.amount === 'string') parts.push(money(Number(d.amount)));
    if (typeof d.reference === 'string') parts.push(d.reference);
    if (typeof d.order_id === 'string' && !d.reference) parts.push(d.order_id);
    return parts.join(' · ');
  };

  return { when, eventLabel, methodLabel, eventDetail };
}

export function PaymentStatusPill({ payment }: { payment: Payment }) {
  const { t } = useIntl();
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-medium',
        payment.status === 'succeeded' && 'bg-[var(--color-leaf-soft)] text-[var(--color-leaf)]',
        payment.status === 'created' && 'bg-[color-mix(in_srgb,var(--color-sun)_20%,transparent)] text-[var(--color-clay)]',
        (payment.status === 'failed' || payment.status === 'refunded') &&
          'bg-[color-mix(in_srgb,var(--color-ink)_7%,transparent)] text-[var(--color-ink-2)]',
      )}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {t(`payments.status.${payment.status}`)}
      {payment.provider === 'test' && <span className="opacity-70">· {t('payments.test')}</span>}
    </span>
  );
}

/* A booking's payment log as a timeline, oldest first. */
export function PaymentLog({ events, className }: { events: PaymentEvent[]; className?: string }) {
  const { when, eventLabel, eventDetail } = usePaymentFormat();
  const ordered = [...events].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id);

  return (
    <ol className={clsx('relative space-y-3 pl-5', className)}>
      <span aria-hidden="true" className="absolute bottom-1.5 left-[5px] top-1.5 w-px bg-[var(--color-line-strong)]" />
      {ordered.map((event) => {
        const good = event.event === 'payment.succeeded' || event.event === 'booking.confirmed';
        const bad = event.event === 'payment.failed' || event.event === 'payment.signature_rejected';
        const detail = eventDetail(event);
        return (
          <li key={event.id} className="relative">
            <span
              aria-hidden="true"
              className={clsx(
                'absolute -left-5 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-[var(--color-surface)]',
                good ? 'bg-[var(--color-leaf)]' : bad ? 'bg-[var(--color-clay)]' : 'bg-[var(--color-line-strong)]',
              )}
            />
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-[13px] font-medium">{eventLabel(event.event)}</span>
              <time dateTime={event.created_at} className="text-[12px] tabular-nums text-[var(--color-muted)]">
                {when(event.created_at, true)}
              </time>
            </div>
            {detail && <p className="text-[12px] text-[var(--color-muted)]">{detail}</p>}
          </li>
        );
      })}
    </ol>
  );
}
