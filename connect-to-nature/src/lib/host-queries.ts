/* What the shetkari portal needs to draw a dashboard: the farmer's own listing,
   the bookings against it, what they have earned and what is still coming.

   In demo mode this returns one of the seeded farms so the dashboard can be
   walked through without an account — clearly marked in the UI, and read-only. */

import { isSupabaseConfigured } from './env';
import { createServerSupabase } from './supabase/server';
import { demoBookings, demoListings, stableId } from './demo-data';
import type { Booking, HostProfile, Listing } from './types';

export interface HostContext {
  demo: boolean;
  signedIn: boolean;
  host: HostProfile | null;
  listing: Listing | null;
  bookings: Booking[];
  earnings: { month: number; total: number; pending: number };
  openDates: string[];
}

function summarise(bookings: Booking[]): HostContext['earnings'] {
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  let month = 0;
  let total = 0;
  let pending = 0;
  bookings.forEach((booking) => {
    if (booking.status === 'cancelled') return;
    total += Number(booking.farmer_amount);
    if (booking.start_date.startsWith(monthPrefix)) month += Number(booking.farmer_amount);
    if (booking.status !== 'completed') pending += Number(booking.farmer_amount);
  });
  return { month, total, pending };
}

function demoOpenDates(): string[] {
  const dates: string[] = [];
  for (let i = 1; i <= 60; i += 1) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    // Everything open except the odd Wednesday, so the calendar has something
    // to show rather than a wall of green.
    if (date.getDay() !== 3) dates.push(date.toISOString().slice(0, 10));
  }
  return dates;
}

export async function getHostContext(): Promise<HostContext> {
  if (!isSupabaseConfigured) {
    const listing = demoListings.find((item) => item.slug === 'draksha-mala-ozar') ?? demoListings[0];
    const bookings = demoBookings.map((booking) => ({ ...booking, listing_id: listing.id, listing }));
    return {
      demo: true,
      signedIn: false,
      host: listing.host ?? null,
      listing,
      bookings,
      earnings: summarise(bookings),
      openDates: demoOpenDates(),
    };
  }

  const supabase = await createServerSupabase();
  if (!supabase) {
    return { demo: true, signedIn: false, host: null, listing: null, bookings: [], earnings: { month: 0, total: 0, pending: 0 }, openDates: [] };
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { demo: false, signedIn: false, host: null, listing: null, bookings: [], earnings: { month: 0, total: 0, pending: 0 }, openDates: [] };
  }

  const { data: host } = await supabase
    .from('host_profiles')
    .select('*')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (!host) {
    return { demo: false, signedIn: true, host: null, listing: null, bookings: [], earnings: { month: 0, total: 0, pending: 0 }, openDates: [] };
  }

  const { data: listing } = await supabase
    .from('listings')
    .select('*, region:regions(*), host:host_profiles(*), listing_activities(activity:activities(*))')
    .eq('host_id', host.id)
    .maybeSingle();

  const bookings = listing
    ? (await supabase
        .from('bookings')
        .select('*')
        .eq('listing_id', listing.id)
        .order('start_date', { ascending: true })).data ?? []
    : [];

  const openDates = listing
    ? ((await supabase
        .from('availability')
        .select('date')
        .eq('listing_id', listing.id)
        .eq('is_available', true)).data ?? []).map((row: { date: string }) => row.date)
    : [];

  return {
    demo: false,
    signedIn: true,
    host: host as HostProfile,
    listing: (listing as Listing) ?? null,
    bookings: bookings as Booking[],
    earnings: summarise(bookings as Booking[]),
    openDates,
  };
}

/* Used by the admin screen: farms that have been sent for approval. */
export async function getPendingHosts(): Promise<{ host: HostProfile; listing: Listing | null }[]> {
  if (!isSupabaseConfigured) {
    const listing = { ...demoListings[3], status: 'pending' as const, id: stableId('listing', 'pending-demo') };
    return [{ host: { ...listing.host!, verification_status: 'pending' }, listing }];
  }
  const supabase = await createServerSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from('host_profiles')
    .select('*, listings(*)')
    .eq('verification_status', 'pending');
  return (data ?? []).map((row: HostProfile & { listings?: Listing[] }) => ({
    host: row,
    listing: row.listings?.[0] ?? null,
  }));
}
