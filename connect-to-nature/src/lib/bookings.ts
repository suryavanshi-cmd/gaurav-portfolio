import { PLATFORM_FEE_RATE } from './env';

export interface Amounts {
  total: number;
  platformFee: number;
  farmerAmount: number;
}

/* Prices are recomputed on the server from the listing row. What the browser
   sends is which farm, which dates and how many people — never how much it
   costs. */
export function computeAmounts(basePrice: number, guests: number): Amounts {
  const total = Math.round(basePrice * guests);
  const platformFee = Math.round(total * PLATFORM_FEE_RATE);
  return { total, platformFee, farmerAmount: total - platformFee };
}

const CODE_ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY34679';

/* Mirrors public.generate_booking_code() so a demo booking looks like a real
   one. In a configured deployment the database generates the code, not this. */
export function demoBookingCode(): string {
  let out = '';
  for (let i = 0; i < 6; i += 1) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `CTN-${out}`;
}

export function twoDayRange(startDate: string): { start: string; end: string } {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 2);
  return { start: startDate, end: end.toISOString().slice(0, 10) };
}
