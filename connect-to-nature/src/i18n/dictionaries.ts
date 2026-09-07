import en from './messages/en.json';
import hi from './messages/hi.json';
import mr from './messages/mr.json';
import { DEFAULT_LOCALE, type Locale } from './config';

/* All three dictionaries ship to the browser together — about 40 kB of JSON in
   total. That is the price of switching language without a network round trip
   or a page reload, and it is a price worth paying for an audience that often
   switches once, at the start, on a slow connection. */
export const MESSAGES: Record<Locale, Record<string, unknown>> = { en, hi, mr };

export type I18nField = Partial<Record<Locale, string>> | string | null | undefined;

function walk(source: Record<string, unknown> | undefined, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, source);
}

/* translate('planner.q1') falls back to English, then to the key itself, so a
   missing string shows something readable rather than a hole in the page. */
export function translate(locale: Locale, path: string, vars?: Record<string, string | number>): string {
  let value = walk(MESSAGES[locale], path);
  if (value === undefined) value = walk(MESSAGES[DEFAULT_LOCALE], path);
  if (typeof value !== 'string') return path;
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

export function translateList(locale: Locale, path: string): string[] {
  const value = walk(MESSAGES[locale], path) ?? walk(MESSAGES[DEFAULT_LOCALE], path);
  return Array.isArray(value) ? (value as string[]) : [];
}

/* Content out of the database is {en, hi, mr} jsonb. Same fallback order. */
export function pickText(field: I18nField, locale: Locale): string {
  if (field == null) return '';
  if (typeof field === 'string') return field;
  return field[locale] ?? field[DEFAULT_LOCALE] ?? Object.values(field)[0] ?? '';
}

/* Latin digits in all three languages, grouped Indian-style (2,40,000). A price
   is compared at a glance and checked against a bank app, so only the words
   around it change with the language. */
export function formatMoney(value: number, opts?: { decimals?: boolean }): string {
  return `₹${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: opts?.decimals ? 2 : 0,
    maximumFractionDigits: opts?.decimals ? 2 : 0,
  }).format(Math.round(opts?.decimals ? value * 100 : value) / (opts?.decimals ? 100 : 1))}`;
}

export function formatDate(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const months = translateList(locale, 'months');
  return `${date.getDate()} ${months[date.getMonth()] ?? ''} ${date.getFullYear()}`;
}
