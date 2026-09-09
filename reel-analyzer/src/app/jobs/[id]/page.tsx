import { notFound, redirect } from 'next/navigation';
import { createClient, getUser } from '@/lib/supabase/server';
import { JobProgress } from '@/components/JobProgress';

/**
 * The waiting room. Everything live here comes from the Realtime subscription
 * in JobProgress; this page just establishes ownership and the starting state.
 */
export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!(await getUser())) redirect(`/auth?next=/jobs/${id}`);

  const supabase = await createClient();

  // RLS restricts jobs to the owner, so a miss here is either "not yours" or
  // "does not exist" — both are a 404 as far as the visitor is concerned.
  const { data: job } = await supabase
    .from('jobs')
    .select('id, reel_id, status, error_message')
    .eq('id', id)
    .maybeSingle();

  if (!job) notFound();

  return (
    <div className="mx-auto max-w-xl pt-8">
      <JobProgress
        jobId={job.id}
        reelId={job.reel_id}
        initialStatus={job.status}
        initialError={job.error_message}
      />
    </div>
  );
}
