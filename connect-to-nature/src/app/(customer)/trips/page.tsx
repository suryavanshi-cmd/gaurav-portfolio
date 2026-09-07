import { TripsClient } from '@/components/TripsClient';
import { getMyBookings } from '@/lib/queries';
import { isSupabaseConfigured } from '@/lib/env';
import { getSessionUser } from '@/lib/supabase/server';
import { AuthForm } from '@/components/AuthForm';

export default async function TripsPage() {
  const user = isSupabaseConfigured ? await getSessionUser() : null;

  if (isSupabaseConfigured && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 sm:px-6">
        <AuthForm role="traveler" />
      </div>
    );
  }

  const bookings = await getMyBookings();
  return <TripsClient bookings={bookings} demo={!isSupabaseConfigured} />;
}
