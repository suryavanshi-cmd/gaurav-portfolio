/* One place that knows what this deployment is wired to.

   The app is built so that every one of these can be absent: with no Supabase
   project it serves the seed content read-only, and with no Razorpay keys the
   checkout completes and marks the booking as a demo. That is what makes the
   repository clonable and runnable in one command, and it is also what the
   banner at the top of the page is telling you. */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';

export const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() ?? '';
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim() ?? '';

export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || 'connecttonature.com';
export const HOST_SUBDOMAIN = process.env.NEXT_PUBLIC_HOST_SUBDOMAIN?.trim() || 'shetkari';

export const isSupabaseConfigured =
  SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY.length > 20;

export const isRazorpayConfigured =
  RAZORPAY_KEY_ID.length > 0 && RAZORPAY_KEY_SECRET.length > 0;

export const PLATFORM_FEE_RATE = 0.08;
