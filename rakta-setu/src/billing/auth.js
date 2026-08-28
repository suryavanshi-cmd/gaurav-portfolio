import { supabase } from './supabaseClient.js';
import { log } from '../logger.js';

/**
 * Resolves a Supabase Auth JWT to a billing user id.
 *
 * The token is verified by Supabase, not decoded locally — a locally decoded
 * JWT proves nothing, and a forged `sub` claim would let anyone spend anyone
 * else's credits. `public.users.id` is the same uuid as `auth.users.id`, so
 * the verified id is directly the billing key.
 */
export async function userFromRequest(req) {
  const header = req.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const { data, error } = await supabase().auth.getUser(token);
  if (error || !data?.user) {
    log.debug(`auth: token rejected (${error?.message ?? 'no user'})`);
    return null;
  }
  return { id: data.user.id, email: data.user.email ?? null, phone: data.user.phone ?? null };
}

/** Express middleware: 401 unless the request carries a valid Supabase JWT. */
export async function requireUser(req, res, next) {
  try {
    const user = await userFromRequest(req);
    if (!user) {
      return res.status(401).json({
        error: 'कृपया आधी लॉगिन करा.',
        error_en: 'Authentication required. Send a Supabase access token as "Authorization: Bearer <jwt>".',
      });
    }
    req.user = user;
    return next();
  } catch (err) {
    log.error(`auth middleware failed: ${err.message}`);
    return res.status(503).json({ error: 'लॉगिन तपासता आलं नाही. कृपया पुन्हा प्रयत्न करा.' });
  }
}
