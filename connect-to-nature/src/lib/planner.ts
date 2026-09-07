/* The trip planner.

   Given four answers it picks a farm that is already onboarded and lays two
   days out hour by hour. It is deliberately a pure function over listings: the
   customer portal runs it in the browser as the answers change, and the same
   code could run in a route handler when we start emailing itineraries. */

import { LOCALES, type Locale } from '@/i18n/config';
import { translate } from '@/i18n/dictionaries';
import { PLATFORM_FEE_RATE } from './env';
import type { Activity, ActivityCategory, I18nJson, ItineraryItem, Listing, Slot } from './types';

export interface PlannerAnswers {
  regionSlug: string | null;
  guests: number;
  month: number;
  interests: ActivityCategory[];
  budget: number;
  pace: 'easy' | 'full';
}

export interface PlannerReason {
  kind: 'region' | 'interest' | 'budget' | 'group' | 'season';
  detail?: string;
}

export interface PlannerCost {
  perPerson: number;
  stay: number;
  platformFee: number;
  farmerAmount: number;
  total: number;
}

export interface PlannerResult {
  listing: Listing;
  score: number;
  reasons: PlannerReason[];
  itinerary: ItineraryItem[];
  cost: PlannerCost;
  alternatives: Listing[];
}

export const DEFAULT_ANSWERS: PlannerAnswers = {
  regionSlug: null,
  guests: 2,
  month: new Date().getMonth() + 1,
  interests: [],
  budget: 3000,
  pace: 'full',
};

/* A dictionary string in all three languages at once, so an itinerary built in
   Marathi still reads correctly if the guest switches to Hindi afterwards. */
function fixedText(key: string): I18nJson {
  return LOCALES.reduce<I18nJson>((acc, locale: Locale) => {
    acc[locale] = translate(locale, key);
    return acc;
  }, {});
}

export function scoreListing(listing: Listing, answers: PlannerAnswers): { score: number; reasons: PlannerReason[] } | null {
  if (answers.regionSlug && listing.region?.slug !== answers.regionSlug) return null;
  if (listing.max_guests < answers.guests) return null;
  // A farm more than a quarter over budget is not a near miss, it is a
  // different trip.
  if (listing.base_price > answers.budget * 1.25) return null;

  const reasons: PlannerReason[] = [];
  let score = listing.rating * 4;

  if (answers.regionSlug) {
    score += 8;
    reasons.push({ kind: 'region' });
  }

  const categories = new Set((listing.activities ?? []).map((a) => a.category));
  const matched = answers.interests.filter((interest) => categories.has(interest));
  score += matched.length * 12;
  matched.forEach((interest) => reasons.push({ kind: 'interest', detail: interest }));

  if (listing.base_price <= answers.budget) {
    score += 14;
    reasons.push({ kind: 'budget' });
  } else {
    score -= ((listing.base_price - answers.budget) / answers.budget) * 30;
  }

  if (listing.max_guests >= answers.guests + 2) {
    score += 4;
    reasons.push({ kind: 'group' });
  }

  if (listing.best_months.includes(answers.month)) {
    score += 10;
    reasons.push({ kind: 'season' });
  }

  if (listing.is_featured) score += 2;

  return { score, reasons };
}

/* Pick the activity that best fits a slot: something the guest asked for
   first, then whatever else the farm runs at that hour, never the same twice. */
function pickActivity(
  listing: Listing,
  slot: Slot,
  interests: ActivityCategory[],
  used: Set<string>,
): Activity | undefined {
  const candidates = (listing.activities ?? []).filter(
    (activity) => activity.slots.includes(slot) && !used.has(activity.id),
  );
  if (candidates.length === 0) return undefined;

  const wanted = candidates.filter((activity) => interests.includes(activity.category));
  const pool = wanted.length > 0 ? wanted : candidates;
  const chosen = pool.reduce((best, activity) =>
    activity.duration_minutes > best.duration_minutes ? activity : best,
  );
  used.add(chosen.id);
  return chosen;
}

function asItem(day: 1 | 2, slot: Slot, time: string, activity: Activity): ItineraryItem {
  return {
    day, slot, time,
    activity_id: activity.id,
    activity_slug: activity.slug,
    title: activity.name,
    note: activity.description,
    category: activity.category,
  };
}

function fixedItem(day: 1 | 2, slot: Slot, time: string, key: string): ItineraryItem {
  return {
    day, slot, time,
    title: fixedText(`fixed.${key}`),
    note: fixedText(`fixed.${key}Note`),
  };
}

export function buildItinerary(listing: Listing, answers: PlannerAnswers): ItineraryItem[] {
  const used = new Set<string>();
  const items: ItineraryItem[] = [];
  const full = answers.pace === 'full';

  // Day one: arrive, eat, one thing before dark, one after.
  items.push(fixedItem(1, 'morning', '10:30', 'arrive'));
  items.push(fixedItem(1, 'midday', '13:00', 'lunch1'));

  const afternoon = pickActivity(listing, 'afternoon', answers.interests, used);
  if (afternoon) items.push(asItem(1, 'afternoon', '16:00', afternoon));

  const evening = pickActivity(listing, 'evening', answers.interests, used);
  if (evening) items.push(asItem(1, 'evening', '18:15', evening));

  items.push(fixedItem(1, 'night', '20:30', 'dinner1'));

  const night = pickActivity(listing, 'night', answers.interests, used);
  if (night) items.push(asItem(1, 'night', '21:45', night));
  else items.push(fixedItem(1, 'night', '22:00', 'sleep'));

  // Day two: the farm's own morning, then home.
  const dawn = pickActivity(listing, 'morning', answers.interests, used);
  if (dawn) items.push(asItem(2, 'morning', '06:15', dawn));

  items.push(fixedItem(2, 'morning', '08:45', 'breakfast'));

  if (full) {
    const late = pickActivity(listing, 'morning', answers.interests, used)
      ?? pickActivity(listing, 'midday', answers.interests, used)
      ?? pickActivity(listing, 'afternoon', answers.interests, used);
    if (late) items.push(asItem(2, 'midday', '10:30', late));
  }

  items.push(fixedItem(2, 'afternoon', '13:30', 'lunch2'));
  return items;
}

export function computeCost(listing: Listing, guests: number): PlannerCost {
  const total = listing.base_price * guests;
  const platformFee = Math.round(total * PLATFORM_FEE_RATE);
  return {
    perPerson: listing.base_price,
    stay: total,
    platformFee,
    farmerAmount: total - platformFee,
    total,
  };
}

export function planTrip(listings: Listing[], answers: PlannerAnswers): PlannerResult | null {
  const ranked = listings
    .map((listing) => {
      const scored = scoreListing(listing, answers);
      return scored ? { listing, ...scored } : null;
    })
    .filter((entry): entry is { listing: Listing; score: number; reasons: PlannerReason[] } => entry !== null)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) return null;

  const [best, ...rest] = ranked;
  return {
    listing: best.listing,
    score: best.score,
    reasons: best.reasons,
    itinerary: buildItinerary(best.listing, answers),
    cost: computeCost(best.listing, answers.guests),
    alternatives: rest.slice(0, 2).map((entry) => entry.listing),
  };
}
