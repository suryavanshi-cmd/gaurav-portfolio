import { AdminPanel } from '@/components/AdminPanel';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';
import { DemoBanner } from '@/components/DemoBanner';
import { AdminGate } from '@/components/AdminGate';
import { getAdminPayments, getAdminStats, getAllRegions, getHostLeads, getPaymentEventFeed } from '@/lib/admin-queries';
import { AdminPayments } from '@/components/payments/AdminPayments';
import { getPendingHosts } from '@/lib/host-queries';
import { getProfile } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import type { Profile } from '@/lib/types';

/* The third portal is a role-gated section rather than a third application:
   it shares the same session, the same database and the same components, and
   the only thing that separates it is profiles.role — checked here for the
   page, and again in the API route for every write it makes. */
export default async function AdminPage() {
  const profile = (await getProfile()) as Profile | null;
  const allowed = !isSupabaseConfigured || profile?.role === 'admin';

  const [stats, pending, leads, regions, payments, feed] = allowed
    ? await Promise.all([
        getAdminStats(), getPendingHosts(), getHostLeads(), getAllRegions(),
        getAdminPayments(), getPaymentEventFeed(),
      ])
    : [null, [], [], [], [], []];

  return (
    <>
      {!isSupabaseConfigured && <DemoBanner />}
      <SiteNav profile={profile} />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-12 sm:px-6">
        {allowed && stats ? (
          <div className="space-y-14">
            <AdminPanel
              stats={stats}
              pending={pending}
              leads={leads}
              regions={regions}
              demo={!isSupabaseConfigured}
            />
            <AdminPayments payments={payments} feed={feed} demo={!isSupabaseConfigured} />
          </div>
        ) : (
          <AdminGate />
        )}
      </main>
      <SiteFooter demo={!isSupabaseConfigured} />
    </>
  );
}
