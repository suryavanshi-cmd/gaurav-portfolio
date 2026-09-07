import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

/* Opening and closing dates on the host calendar. The policy on availability
   only lets the owner of the listing write these rows, so this route does not
   need to check ownership itself — it would be a second, weaker copy of the
   same rule. */

const AvailabilityInput = z.object({
  listingId: z.string().uuid(),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(120),
  isAvailable: z.boolean(),
  priceOverride: z.number().min(0).max(100000).nullable().optional(),
});

export async function POST(request: Request) {
  const parsed = AvailabilityInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  if (!isSupabaseConfigured) return NextResponse.json({ demo: true });

  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

  const { error } = await supabase.from('availability').upsert(
    parsed.data.dates.map((date) => ({
      listing_id: parsed.data.listingId,
      date,
      is_available: parsed.data.isAvailable,
      price_override: parsed.data.priceOverride ?? null,
    })),
    { onConflict: 'listing_id,date' },
  );

  if (error) return NextResponse.json({ error: 'upsert_failed', detail: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
