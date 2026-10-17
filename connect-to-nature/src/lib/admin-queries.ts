import { isSupabaseConfigured } from './env';
import { createServerSupabase } from './supabase/server';
import { demoBookings, demoListings, demoRegions } from './demo-data';
import { demoLedger } from './payments';
import type { I18nJson, Payment, PaymentEvent, Region } from './types';

export interface AdminStats {
  farms: number;
  bookings: number;
  gmv: number;
  owed: number;
}

export interface HostLead {
  id: string;
  code: string;
  name: string;
  phone: string;
  village: string | null;
  district: string | null;
  created_at: string;
}

export async function getAdminStats(): Promise<AdminStats> {
  if (!isSupabaseConfigured) {
    return {
      farms: demoListings.length,
      bookings: demoBookings.length,
      gmv: demoBookings.reduce((sum, booking) => sum + booking.total_amount, 0),
      owed: demoBookings
        .filter((booking) => booking.status !== 'completed')
        .reduce((sum, booking) => sum + booking.farmer_amount, 0),
    };
  }

  const supabase = await createServerSupabase();
  if (!supabase) return { farms: 0, bookings: 0, gmv: 0, owed: 0 };

  const [farms, bookings, payouts] = await Promise.all([
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('bookings').select('total_amount'),
    supabase.from('payouts').select('amount').eq('status', 'scheduled'),
  ]);

  const rows = (bookings.data ?? []) as { total_amount: number }[];
  const owedRows = (payouts.data ?? []) as { amount: number }[];

  return {
    farms: farms.count ?? 0,
    bookings: rows.length,
    gmv: rows.reduce((sum, row) => sum + Number(row.total_amount), 0),
    owed: owedRows.reduce((sum, row) => sum + Number(row.amount), 0),
  };
}

export async function getHostLeads(): Promise<HostLead[]> {
  if (!isSupabaseConfigured) {
    return [
      {
        id: 'demo-lead',
        code: 'CTN-H2041',
        name: 'Vitthal Kamble',
        phone: '+91 90210 77431',
        village: 'Devrukh',
        district: 'Ratnagiri',
        created_at: new Date().toISOString(),
      },
    ];
  }
  const supabase = await createServerSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from('host_leads')
    .select('id, code, name, phone, village, district, created_at')
    .order('created_at', { ascending: false })
    .limit(30);
  return (data ?? []) as HostLead[];
}

export async function getAllRegions(): Promise<Region[]> {
  if (!isSupabaseConfigured) return demoRegions;
  const supabase = await createServerSupabase();
  if (!supabase) return demoRegions;
  const { data } = await supabase.from('regions').select('*').order('sort_order');
  return (data ?? []) as Region[];
}

/* ─── payments ─────────────────────────────────────────────────────────────── */

export interface AdminPayment extends Payment {
  booking: {
    code: string;
    guest_name: string;
    start_date: string;
    listing: { slug: string; title: I18nJson } | null;
    payment_events: PaymentEvent[];
  } | null;
}

export interface AdminPaymentEvent extends PaymentEvent {
  booking: { code: string; guest_name: string } | null;
}

function demoPayments(): { payments: AdminPayment[]; events: AdminPaymentEvent[] } {
  const payments: AdminPayment[] = [];
  const events: AdminPaymentEvent[] = [];
  for (const booking of demoBookings) {
    const ledger = demoLedger(booking);
    const listing = booking.listing ? { slug: booking.listing.slug, title: booking.listing.title } : null;
    for (const payment of ledger.payments) {
      payments.push({
        ...payment,
        booking: {
          code: booking.code,
          guest_name: booking.guest_name,
          start_date: booking.start_date,
          listing,
          payment_events: ledger.payment_events,
        },
      });
    }
    for (const event of ledger.payment_events) {
      events.push({ ...event, booking: { code: booking.code, guest_name: booking.guest_name } });
    }
  }
  events.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
  return { payments, events };
}

/* Every payment, newest first, each with its booking and the booking's whole
   log. Read through the admin's own session: the ledger's policies let an
   admin see every row, so this needs no service role. */
export async function getAdminPayments(): Promise<AdminPayment[]> {
  if (!isSupabaseConfigured) return demoPayments().payments;
  const supabase = await createServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('payments')
    .select('*, booking:bookings(code, guest_name, start_date, listing:listings(slug, title), payment_events(*))')
    .order('created_at', { ascending: false })
    // The log inside each payment is put in order by PaymentLog itself, rather
    // than by ordering an embed nested under an alias here.
    .limit(200);
  return error || !data ? [] : (data as unknown as AdminPayment[]);
}

/* The raw log across every booking — the last hundred lines. */
export async function getPaymentEventFeed(): Promise<AdminPaymentEvent[]> {
  if (!isSupabaseConfigured) return demoPayments().events;
  const supabase = await createServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('payment_events')
    .select('*, booking:bookings(code, guest_name)')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(100);
  return error || !data ? [] : (data as unknown as AdminPaymentEvent[]);
}
