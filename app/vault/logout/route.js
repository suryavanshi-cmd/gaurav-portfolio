import { CLEAR_COOKIE, SEC_HEADERS } from '../../../lib/vault.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return new Response(null, { status: 303, headers: { location: '/vault', 'set-cookie': CLEAR_COOKIE, ...SEC_HEADERS } });
}
