import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

/* Approving a farm publishes it. Two things have to be true before that can
   happen: the caller's profile says admin (checked here against their own
   session), and the write itself goes through the service role, because
   publishing touches a row the admin does not own. */

const DecisionInput = z.object({
  hostId: z.string().uuid(),
  listingId: z.string().uuid().optional(),
  decision: z.enum(['approve', 'reject']),
  note: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const parsed = DecisionInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  if (!isSupabaseConfigured) return NextResponse.json({ demo: true });

  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', userData.user.id).maybeSingle();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: 'service_role_missing' }, { status: 503 });

  const approved = parsed.data.decision === 'approve';

  const { error: hostError } = await admin
    .from('host_profiles')
    .update({
      verification_status: approved ? 'approved' : 'rejected',
      verification_note: parsed.data.note ?? null,
      verified_at: approved ? new Date().toISOString() : null,
    })
    .eq('id', parsed.data.hostId);

  if (hostError) return NextResponse.json({ error: 'update_failed' }, { status: 500 });

  if (parsed.data.listingId) {
    await admin
      .from('listings')
      .update({
        status: approved ? 'published' : 'rejected',
        published_at: approved ? new Date().toISOString() : null,
      })
      .eq('id', parsed.data.listingId);
  }

  return NextResponse.json({ ok: true });
}
