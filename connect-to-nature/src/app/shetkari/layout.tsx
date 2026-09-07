import { HostNav } from '@/components/host/HostNav';
import { SiteFooter } from '@/components/SiteFooter';
import { DemoBanner } from '@/components/DemoBanner';
import { getSessionUser } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

export default async function ShetkariLayout({ children }: { children: React.ReactNode }) {
  const user = isSupabaseConfigured ? await getSessionUser() : null;

  return (
    <>
      {!isSupabaseConfigured && <DemoBanner />}
      <HostNav signedIn={Boolean(user)} />
      <main className="text-[17px]">{children}</main>
      <SiteFooter demo={!isSupabaseConfigured} />
    </>
  );
}
