import { AlertTriangle } from 'lucide-react';

/** Shown instead of a crash when the deployment has no Supabase credentials. */
export function SetupNotice() {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-dashed p-8 text-center">
      <AlertTriangle className="text-muted-foreground mx-auto size-6" />
      <h2 className="mt-3 font-semibold">Not configured yet</h2>
      <p className="text-muted-foreground mt-2 text-sm">
        This deployment is missing its Supabase credentials. Set{' '}
        <code className="bg-muted rounded px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
        <code className="bg-muted rounded px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then redeploy.
      </p>
    </div>
  );
}
