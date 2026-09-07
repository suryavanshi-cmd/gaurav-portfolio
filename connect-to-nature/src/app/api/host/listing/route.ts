import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

/* Onboarding, submitted in one call at the end of the five steps.

   It creates the host profile and the listing together, both in a state that
   needs an admin to approve: verification_status = 'pending' and
   listing.status = 'pending'. Nothing a farmer submits here is publicly visible
   until someone at Connect to Nature has seen it — which is the promise the
   traveller portal makes when it says every host is verified. */

const OnboardInput = z.object({
  hostName: z.string().min(2).max(120),
  farmName: z.string().min(2).max(160),
  village: z.string().min(1).max(120),
  district: z.string().min(1).max(120),
  regionSlug: z.string().min(1),
  phone: z.string().min(6).max(20),
  landAcres: z.number().min(0).max(10000).optional(),
  bio: z.string().max(2000).optional(),
  title: z.string().min(4).max(200),
  description: z.string().min(10).max(4000),
  stayType: z.string().min(2).max(40),
  scene: z.string().min(2).max(24).default('orchard'),
  crops: z.array(z.string()).max(20).default([]),
  basePrice: z.number().min(100).max(50000),
  maxGuests: z.number().int().min(1).max(60),
  bedrooms: z.number().int().min(1).max(30),
  activitySlugs: z.array(z.string()).max(40).default([]),
  languages: z.array(z.enum(['en', 'hi', 'mr'])).default(['mr']),
  payoutUpi: z.string().max(120).optional(),
  language: z.enum(['en', 'hi', 'mr']).default('mr'),
});

function slugify(value: string, village: string): string {
  const base = `${value} ${village}`
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base || `farm-${Date.now()}`;
}

export async function POST(request: Request) {
  const parsed = OnboardInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', issues: parsed.error.issues }, { status: 400 });
  }
  const input = parsed.data;

  if (!isSupabaseConfigured) {
    return NextResponse.json({ demo: true, listing: { slug: slugify(input.farmName, input.village), status: 'pending' } });
  }

  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

  const { data: region } = await supabase
    .from('regions').select('id').eq('slug', input.regionSlug).maybeSingle();
  if (!region) return NextResponse.json({ error: 'region_not_found' }, { status: 400 });

  // The farmer writes in their own language; the other two are filled by the
  // field team when they visit, which is why the column is jsonb and not text.
  const localised = (value: string) => ({ [input.language]: value });

  const { data: host, error: hostError } = await supabase
    .from('host_profiles')
    .upsert({
      user_id: userData.user.id,
      farm_name: localised(input.farmName),
      host_name: localised(input.hostName),
      bio: input.bio ? localised(input.bio) : {},
      region_id: region.id,
      district: input.district,
      village: localised(input.village),
      phone: input.phone,
      land_acres: input.landAcres ?? null,
      languages: input.languages,
      verification_status: 'pending',
      hosting_since: new Date().getFullYear(),
      payout_upi: input.payoutUpi ?? null,
    }, { onConflict: 'user_id' })
    .select('id')
    .single();

  if (hostError || !host) {
    return NextResponse.json({ error: 'host_failed', detail: hostError?.message }, { status: 400 });
  }

  const slug = slugify(input.farmName, input.village);
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .insert({
      host_id: host.id,
      slug,
      title: localised(input.title),
      description: localised(input.description),
      region_id: region.id,
      district: input.district,
      village: localised(input.village),
      stay_type: input.stayType,
      scene: input.scene,
      crops: input.crops,
      base_price: input.basePrice,
      max_guests: input.maxGuests,
      bedrooms: input.bedrooms,
      status: 'pending',
    })
    .select('id, slug')
    .single();

  if (listingError || !listing) {
    return NextResponse.json({ error: 'listing_failed', detail: listingError?.message }, { status: 400 });
  }

  if (input.activitySlugs.length > 0) {
    const { data: activities } = await supabase
      .from('activities').select('id, slug').in('slug', input.activitySlugs);
    if (activities?.length) {
      await supabase.from('listing_activities').insert(
        activities.map((activity: { id: string }) => ({ listing_id: listing.id, activity_id: activity.id })),
      );
    }
  }

  return NextResponse.json({ listing: { id: listing.id, slug: listing.slug, status: 'pending' } });
}
