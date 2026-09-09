import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { AuthForm } from '@/components/AuthForm';
import { SetupNotice } from '@/components/SetupNotice';

export default async function AuthPage() {
  if (!isSupabaseConfigured) return <SetupNotice />;
  if (await getUser()) redirect('/');

  return (
    <div className="mx-auto max-w-md pt-12">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        We&apos;ll email you a link. No password to remember, and new accounts start with five free analyses.
      </p>
      <div className="mt-6">
        <AuthForm />
      </div>
    </div>
  );
}
