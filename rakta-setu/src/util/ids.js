import crypto from 'node:crypto';

const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz'; // no 0/1/i/l/o — patients read these aloud

/** URL-safe random id, unambiguous when spoken or typed on a feature phone. */
export function randomId(length = 12) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** Long, high-entropy token that acts as the capability key for a report link. */
export function reportToken() {
  return randomId(24);
}

export function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

/** Constant-time string compare — used for admin tokens and patient PINs. */
export function safeEqual(a, b) {
  const ba = Buffer.from(String(a ?? ''));
  const bb = Buffer.from(String(b ?? ''));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
