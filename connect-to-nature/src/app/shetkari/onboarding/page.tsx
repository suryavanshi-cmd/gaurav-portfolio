import { HostOnboarding } from '@/components/host/HostOnboarding';
import { getActivities, getRegions } from '@/lib/queries';
import { getSessionUser } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

export default async function OnboardingPage() {
  const [regions, activities, user] = await Promise.all([
    getRegions(),
    getActivities(),
    isSupabaseConfigured ? getSessionUser() : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-10 sm:px-6">
      <HostOnboarding
        regions={regions}
        activities={activities}
        demo={!isSupabaseConfigured}
        signedIn={Boolean(user)}
      />
    </div>
  );
}
