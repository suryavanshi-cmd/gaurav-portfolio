import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { isRazorpayConfigured, isSupabaseConfigured } from '@/lib/env';
import { computeAmounts, demoBookingCode, twoDayRange } from '@/lib/bookings';
import { findDemoListing } from '@/lib/demo-data';

const BookingInput = z.object({
  listingSlug: z.string().min(1),
  packageSlug: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(40),
  name: z.string().min(2).max(120),
  phone: z.string().min(6).max(20),
  note: z.string().max(600).optional(),
  language: z.enum(['en', 'hi', 'mr']).default('en'),
  itinerary: z.array(z.record(z.string(), z.unknown())).optional(),
});

export async function POST(request: Request) {
  const parsed = BookingInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', issues: parsed.error.issues }, { status: 400 });
  }
  const input = parsed.data;
  const { start, end } = twoDayRange(input.startDate);

  /* Demo mode: echo a booking back so the flow can be walked end to end, and
     store nothing anywhere. */
  if (!isSupabaseConfigured) {
    const listing = findDemoListing(input.listingSlug);
    if (!listing) return NextResponse.json({ error: 'listing_not_found' }, { status: 404 });
    const amounts = computeAmounts(listing.base_price, input.guests);
    return NextResponse.json({
      demo: true,
      booking: {
        code: demoBookingCode(),
        start_date: start,
        end_date: end,
        guest_count: input.guests,
        guest_name: input.name,
        guest_phone: input.phone,
        status: 'confirmed',
        payment_status: 'demo',
        ...amounts,
      },
    });
  }

  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id, base_price, max_guests, status')
    .eq('slug', input.listingSlug)
    .maybeSingle();

  if (listingError || !listing) return NextResponse.json({ error: 'listing_not_found' }, { status: 404 });
  if (listing.status !== 'published') return NextResponse.json({ error: 'listing_unavailable' }, { status: 409 });
  if (input.guests > listing.max_guests) {
    return NextResponse.json({ error: 'too_many_guests', max: listing.max_guests }, { status: 409 });
  }

  // The same check the host's calendar drives, run in the database so two
  // people asking for the same weekend at the same moment cannot both win.
  const { data: available } = await supabase.rpc('listing_is_available', {
    listing: listing.id,
    from_date: start,
    to_date: end,
  });
  if (available === false) return NextResponse.json({ error: 'dates_unavailable' }, { status: 409 });

  let packageId: string | null = null;
  if (input.packageSlug) {
    const { data: pkg } = await supabase
      .from('trip_packages').select('id').eq('slug', input.packageSlug).maybeSingle();
    packageId = pkg?.id ?? null;
  }

  let itineraryId: string | null = null;
  if (input.itinerary?.length) {
    const { data: itinerary } = await supabase
      .from('custom_itineraries')
      .insert({
        traveler_id: userData.user.id,
        listing_id: listing.id,
        guest_count: input.guests,
        days: input.itinerary,
        total_price: computeAmounts(listing.base_price, input.guests).total,
      })
      .select('id')
      .single();
    itineraryId = itinerary?.id ?? null;
  }

  const amounts = computeAmounts(listing.base_price, input.guests);
  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      traveler_id: userData.user.id,
      listing_id: listing.id,
      trip_package_id: packageId,
      itinerary_id: itineraryId,
      start_date: start,
      end_date: end,
      guest_count: input.guests,
      guest_name: input.name,
      guest_phone: input.phone,
      guest_note: input.note ?? null,
      language: input.language,
      total_amount: amounts.total,
      farmer_amount: amounts.farmerAmount,
      platform_fee: amounts.platformFee,
      // With no payment gateway configured the booking is confirmed and marked
      // as a demo, rather than left in a state no one can move it out of.
      status: isRazorpayConfigured ? 'pending' : 'confirmed',
      payment_status: isRazorpayConfigured ? 'unpaid' : 'demo',
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: 'insert_failed', detail: error.message }, { status: 500 });
  return NextResponse.json({ demo: !isRazorpayConfigured, booking });
}
