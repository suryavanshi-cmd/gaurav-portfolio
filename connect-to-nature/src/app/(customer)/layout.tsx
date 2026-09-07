import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';
import { DemoBanner } from '@/components/DemoBanner';
import { getProfile } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import type { Profile } from '@/lib/types';

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const profile = (await getProfile()) as Profile | null;

  return (
    <>
      {!isSupabaseConfigured && <DemoBanner />}
      <SiteNav profile={profile} />
      <main>{children}</main>
      <SiteFooter demo={!isSupabaseConfigured} />
    </>
  );
}
