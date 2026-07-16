import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const emailPattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return { url: url?.replace(/\/$/, ''), key };
}

export async function POST(request) {
  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 12_000) {
      return NextResponse.json({ message: 'Message payload is too large.' }, { status: 413 });
    }

    const body = await request.json();
    const name = clean(body.name);
    const email = clean(body.email).toLowerCase();
    const message = clean(body.message);
    const company = clean(body.company);

    if (company) {
      return NextResponse.json({ message: 'Message received.' }, { status: 201 });
    }

    if (name.length < 2 || name.length > 120) {
      return NextResponse.json({ message: 'Name must contain between 2 and 120 characters.' }, { status: 400 });
    }

    if (email.length < 5 || email.length > 254 || !emailPattern.test(email)) {
      return NextResponse.json({ message: 'Enter a valid email address.' }, { status: 400 });
    }

    if (message.length < 10 || message.length > 4000) {
      return NextResponse.json({ message: 'Message must contain between 10 and 4000 characters.' }, { status: 400 });
    }

    const { url, key } = getSupabaseConfig();
    if (!url || !key) {
      console.error('Supabase contact configuration is missing.');
      return NextResponse.json({ message: 'Contact service is temporarily unavailable.' }, { status: 503 });
    }

    const response = await fetch(`${url}/rest/v1/portfolio_contacts`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ name, email, message }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase contact insert failed.', {
        status: response.status,
        detail: errorText.slice(0, 500),
      });
      return NextResponse.json({ message: 'Unable to save your message right now.' }, { status: 502 });
    }

    return NextResponse.json({ message: 'Message received.' }, { status: 201 });
  } catch (error) {
    console.error('Portfolio contact route failed.', error);
    return NextResponse.json({ message: 'Unable to process your message.' }, { status: 500 });
  }
}
