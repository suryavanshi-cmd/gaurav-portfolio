import { HostDashboard } from '@/components/host/HostDashboard';
import { getHostContext } from '@/lib/host-queries';
import { AuthForm } from '@/components/AuthForm';
import { NoListingYet } from '@/components/host/NoListingYet';

export default async function HostDashboardPage() {
  const context = await getHostContext();

  if (!context.demo && !context.signedIn) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <AuthForm role="host" />
      </div>
    );
  }

  if (!context.demo && context.signedIn && !context.host) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <NoListingYet />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-10 sm:px-6">
      <HostDashboard context={context} />
    </div>
  );
}
