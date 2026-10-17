import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from '../env';

/* The client for everything public: farms, vibhags, activities, packages,
   reviews.
 *
 * It carries no cookies and no session, which is what lets these reads sit
 * inside unstable_cache — a cached function may not touch request state — and
 * is also correct on its own terms: what a visitor sees of the catalogue does
 * not depend on who they are. Anything user-specific (bookings, a host's
 * dashboard, the admin screen) keeps the cookie-bound client in server.ts.
 *
 * Every request carries a deadline. Without one, a database that is slow or
 * unreachable turns into a page that hangs: this was measured at seven seconds
 * per request against a blocked host, after which the seed rows were served
 * anyway. Two and a half seconds is far longer than a healthy query from a
 * function sitting in the same region, and far shorter than a visitor's
 * patience. */

const REQUEST_TIMEOUT_MS = 2_500;

let client: SupabaseClient | null = null;

export function catalogueClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (client) return client;

  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) =>
        fetch(input as RequestInfo, {
          ...init,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          cache: 'no-store',
        }),
    },
  });
  return client;
}

/* A deadline over the whole operation, not over each attempt.
 *
 * supabase-js retries a failed request inside its own fetch, so a signal passed
 * to fetch bounds one attempt while the call as a whole runs on. Measured
 * against an unreachable host: a plain fetch failed in 99ms, the same query
 * through the client took 7,063ms. This race is what the caller's budget
 * actually is. */
export function withDeadline<T>(what: string, work: PromiseLike<T>, ms = REQUEST_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      const error = new Error(`[catalogue] ${what} exceeded ${ms}ms`);
      error.name = 'TimeoutError';
      reject(error);
    }, ms);
    // Node keeps the process alive for a pending timer; this one must not.
    timer.unref?.();
    Promise.resolve(work).then(
      (value) => { clearTimeout(timer); resolve(value); },
      (cause) => { clearTimeout(timer); reject(cause); },
    );
  });
}

/* Inside a cached function, a failure must throw.
 *
 * unstable_cache stores whatever the function returns, so returning the
 * fallback there would pin the seed rows in the cache for the whole revalidate
 * window — a thirty-second database blip would become five minutes of stale
 * content. Throwing leaves the cache empty, the caller catches and serves the
 * fallback for that one request, and the next request tries the database
 * again. */
export async function mustRead<T>(
  what: string,
  read: () => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<T> {
  const { data, error } = await withDeadline(what, read());
  if (error || data == null) {
    throw new Error(`[catalogue] ${what} failed: ${error ? JSON.stringify(error) : 'no rows'}`);
  }
  return data as T;
}

/* A breaker, so an outage is paid for once rather than once per request.
 *
 * Not caching failures means each request retries, which is what makes the
 * site recover the moment the database does — but with the database actually
 * down that is every visitor waiting out the full timeout. After a failure the
 * breaker stays open for ten seconds: requests in that window get the fallback
 * immediately, and the first request after it tries again. Per function
 * instance, which is the right scope: instances fail and recover separately. */
const BREAKER_OPEN_MS = 10_000;
let breakerOpenUntil = 0;

/* Outside the cache: serve the fallback, and remember that the database is
   unhappy. A farm that cannot be fetched should look like a quiet site, not a
   broken one. */
export async function orFallback<T>(what: string, read: () => Promise<T>, fallback: T): Promise<T> {
  if (Date.now() < breakerOpenUntil) return fallback;
  try {
    return await read();
  } catch (cause) {
    const timedOut = cause instanceof Error && cause.name === 'TimeoutError';
    console.warn(
      `[catalogue] ${what} ${timedOut ? `timed out after ${REQUEST_TIMEOUT_MS}ms` : 'failed'}; ` +
      `serving fallback and pausing reads for ${BREAKER_OPEN_MS / 1000}s`,
      cause,
    );
    breakerOpenUntil = Date.now() + BREAKER_OPEN_MS;
    return fallback;
  }
}

/* Kept for the uncached reads, where returning the fallback is the whole job. */
export async function readOr<T>(
  what: string,
  // PostgREST's builder is a thenable, not a Promise, and the row types it
  // infers from a select string do not line up with the hand-written ones in
  // types.ts. The shape is checked where it is used, not here.
  read: () => PromiseLike<{ data: unknown; error: unknown }>,
  fallback: T,
): Promise<T> {
  try {
    const { data, error } = await withDeadline(what, read());
    if (error || data == null) {
      console.warn(`[catalogue] ${what} failed, serving fallback`, error);
      return fallback;
    }
    return data as T;
  } catch (cause) {
    const timedOut = cause instanceof Error && cause.name === 'TimeoutError';
    console.warn(`[catalogue] ${what} ${timedOut ? `timed out after ${REQUEST_TIMEOUT_MS}ms` : 'threw'}, serving fallback`, cause);
    return fallback;
  }
}

/* Cache lifetimes. The catalogue is edited by a handful of people a week, so it
   is cached for minutes and invalidated by tag the moment something changes —
   see revalidate.ts. */
export const CATALOGUE_REVALIDATE_SECONDS = 300;

export const TAGS = {
  regions: 'ctn:regions',
  activities: 'ctn:activities',
  listings: 'ctn:listings',
  packages: 'ctn:packages',
  listing: (slug: string) => `ctn:listing:${slug}`,
} as const;
