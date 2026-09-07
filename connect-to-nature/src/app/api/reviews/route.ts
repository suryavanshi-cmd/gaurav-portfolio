import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

/* A review is only accepted against a booking that belongs to the reviewer and
   has completed — the policy in the RLS migration enforces that, so this route
   does not have to re-check it and cannot be talked out of it. */

const ReviewInput = z.object({
  bookingId: z.string().uuid(),
  listingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(3).max(2000),
  language: z.enum(['en', 'hi', 'mr']).default('en'),
});

export async function POST(request: Request) {
  const parsed = ReviewInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const input = parsed.data;

  if (!isSupabaseConfigured) return NextResponse.json({ demo: true });

  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

  const { error } = await supabase.from('reviews').insert({
    booking_id: input.bookingId,
    listing_id: input.listingId,
    traveler_id: userData.user.id,
    rating: input.rating,
    comment: { [input.language]: input.comment },
  });

  if (error) return NextResponse.json({ error: 'insert_failed', detail: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
