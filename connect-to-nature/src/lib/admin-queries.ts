import { isSupabaseConfigured } from './env';
import { createServerSupabase } from './supabase/server';
import { demoBookings, demoListings, demoRegions } from './demo-data';
import type { Region } from './types';

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
