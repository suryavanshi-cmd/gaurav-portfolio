import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

/* A farmer leaving a phone number before they have an account. This is the
   first step of onboarding and the only form on the site that accepts a write
   from someone who is not signed in — which is why the policy on host_leads
   allows insert and nothing else. */

const LeadInput = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(6).max(20),
  village: z.string().max(120).optional(),
  district: z.string().max(120).optional(),
  regionSlug: z.string().max(60).optional(),
  landAcres: z.number().min(0).max(10000).optional(),
  beds: z.number().int().min(0).max(200).optional(),
  crops: z.string().max(300).optional(),
  language: z.enum(['en', 'hi', 'mr']).default('mr'),
});

function leadCode(): string {
  return `CTN-H${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function POST(request: Request) {
  const parsed = LeadInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', issues: parsed.error.issues }, { status: 400 });
  }
  const input = parsed.data;
  const code = leadCode();

  if (!isSupabaseConfigured) {
    return NextResponse.json({ demo: true, lead: { code, ...input } });
  }

  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  let regionId: string | null = null;
  if (input.regionSlug) {
    const { data: region } = await supabase
      .from('regions').select('id').eq('slug', input.regionSlug).maybeSingle();
    regionId = region?.id ?? null;
  }

  const { error } = await supabase.from('host_leads').insert({
    code,
    name: input.name,
    phone: input.phone,
    village: input.village ?? null,
    district: input.district ?? null,
    region_id: regionId,
    land_acres: input.landAcres ?? null,
    beds: input.beds ?? null,
    crops: input.crops ?? null,
    language: input.language,
  });

  if (error) return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  return NextResponse.json({ lead: { code } });
}
