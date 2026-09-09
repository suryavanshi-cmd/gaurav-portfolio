import { RATE_LIMIT_PER_HOUR } from '@/lib/env';
import type { createAdminClient } from '@/lib/supabase/admin';

type Admin = ReturnType<typeof createAdminClient>;

export type GuardFailure = { ok: false; status: number; message: string };
export type GuardSuccess = { ok: true };
export type GuardResult = GuardSuccess | GuardFailure;

/**
 * Credits and rate limit, checked before a job is created.
 *
 * The credit is not spent here — that happens when an analysis completes — so
 * this is a balance check rather than a reservation. Two jobs started in the
 * same second with one credit left is possible and acceptable: `consume_credit`
 * refuses to go below zero, so the worst case is one uncharged analysis.
 */
export async function checkCanCreateJob(admin: Admin, userId: string): Promise<GuardResult> {
  const { data: profile, error } = await admin
    .from('profiles')
    .select('credits_remaining')
    .eq('id', userId)
    .maybeSingle();

  if (error) return { ok: false, status: 500, message: 'could not read your account' };
  if (!profile) return { ok: false, status: 403, message: 'your account is not set up yet — try signing in again' };

  if (profile.credits_remaining <= 0) {
    return {
      ok: false,
      status: 402,
      message: "you're out of credits — each analysis uses one, and there are five on the free plan",
    };
  }

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await admin
    .from('reels')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);

  if (countError) return { ok: false, status: 500, message: 'could not check your recent activity' };

  if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
    return {
      ok: false,
      status: 429,
      message: `that's ${RATE_LIMIT_PER_HOUR} reels in an hour, which is the limit — try again a little later`,
    };
  }

  return { ok: true };
}
