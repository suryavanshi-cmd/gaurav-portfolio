import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

/* Adding a vibhag is a row, not a release. Vidarbha, Marathwada or Pune
   division can be opened from this screen and the whole product — search
   filters, the planner's first question, the host portal's region list — picks
   it up on the next request, because nothing anywhere hard-codes Kokan or
   Nashik. */

const RegionInput = z.object({
  slug: z.string().regex(/^[a-z0-9-]{2,40}$/),
  name: z.object({ en: z.string().min(1), hi: z.string().min(1), mr: z.string().min(1) }),
  tagline: z.object({ en: z.string(), hi: z.string(), mr: z.string() }).partial().optional(),
  description: z.object({ en: z.string(), hi: z.string(), mr: z.string() }).partial().optional(),
  districts: z.array(z.object({ en: z.string(), hi: z.string(), mr: z.string() }).partial()).max(40).optional(),
  season: z.object({ en: z.string(), hi: z.string(), mr: z.string() }).partial().optional(),
  reach: z.object({ en: z.string(), hi: z.string(), mr: z.string() }).partial().optional(),
  heroScene: z.string().max(24).default('hills'),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#157f5f'),
  sortOrder: z.number().int().min(0).max(999).default(99),
});

export async function POST(request: Request) {
  const parsed = RegionInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', issues: parsed.error.issues }, { status: 400 });
  }
  if (!isSupabaseConfigured) return NextResponse.json({ demo: true, region: parsed.data });

  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', userData.user.id).maybeSingle();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const admin = createAdminSupabase() ?? supabase;
  const input = parsed.data;
  const { error } = await admin.from('regions').insert({
    slug: input.slug,
    name: input.name,
    tagline: input.tagline ?? {},
    description: input.description ?? {},
    districts: input.districts ?? [],
    season: input.season ?? {},
    reach: input.reach ?? {},
    hero_scene: input.heroScene,
    accent: input.accent,
    sort_order: input.sortOrder,
  });

  if (error) return NextResponse.json({ error: 'insert_failed', detail: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
