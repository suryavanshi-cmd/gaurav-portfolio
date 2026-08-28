import { config } from '../config.js';

/**
 * Normalises the many shapes a phone number takes inside lab reports
 * (`9822012345`, `+91 98220 12345`, `091-9822012345`, `0 9822012345`)
 * into bare E.164 digits without the leading `+`, which is what both
 * the Meta Cloud API and Twilio expect.
 *
 * Returns null when the input cannot be a dialable mobile number.
 */
export function normalisePhone(raw, countryCode = config.whatsapp.defaultCountryCode) {
  if (!raw) return null;
  let digits = String(raw).replace(/[^\d+]/g, '');

  if (digits.startsWith('+')) digits = digits.slice(1);
  else if (digits.startsWith('00')) digits = digits.slice(2);

  // Strip Indian STD trunk prefix: 0 9822012345
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);

  // Bare national number — prepend the configured country code.
  if (digits.length === 10) digits = `${countryCode}${digits}`;

  // India: reject anything that is not a real mobile series (6-9).
  if (digits.startsWith('91') && digits.length === 12 && !/^[6-9]/.test(digits.slice(2))) {
    return null;
  }

  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

/** Last four digits — used as the patient's verification PIN. */
export function lastFour(phone) {
  const d = String(phone ?? '').replace(/\D/g, '');
  return d.length >= 4 ? d.slice(-4) : null;
}

export function displayPhone(phone) {
  const d = String(phone ?? '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  return d ? `+${d}` : '';
}
