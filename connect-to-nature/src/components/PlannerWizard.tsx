'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { useIntl } from '@/i18n/provider';
import { SegmentedControl } from './ui/SegmentedControl';
import { Field } from './ui/Field';
import { Scene } from './Scene';
import { Itinerary } from './Itinerary';
import { BookingPanel } from './BookingPanel';
import { Stars, Pill } from './ui/Field';
import {
  DEFAULT_ANSWERS, buildItinerary, computeCost, planTrip,
  type PlannerAnswers, type PlannerResult,
} from '@/lib/planner';
import type { ActivityCategory, Listing, Region } from '@/lib/types';
import { DISTRICT_NAMES } from '@/lib/seed-content';

const CATEGORIES: ActivityCategory[] = [
  'farming', 'trekking', 'water', 'food', 'camping', 'culture', 'craft', 'stars',
];

const STEPS = 4;

export function PlannerWizard({
  listings,
  regions,
  preferredFarm,
}: {
  listings: Listing[];
  regions: Region[];
  preferredFarm?: string;
}) {
  const { t, tx, money, list } = useIntl();
  const months = list('months');

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<PlannerAnswers>(() => {
    const farm = preferredFarm ? listings.find((item) => item.slug === preferredFarm) : undefined;
    return farm
      ? { ...DEFAULT_ANSWERS, regionSlug: farm.region?.slug ?? null, budget: Math.max(DEFAULT_ANSWERS.budget, farm.base_price) }
      : DEFAULT_ANSWERS;
  });
  const [result, setResult] = useState<PlannerResult | null>(null);
  const [swapped, setSwapped] = useState<Listing | null>(null);

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const build = () => {
    const plan = planTrip(listings, answers);
    setResult(plan);
    setSwapped(null);
    setDirection(1);
    setStep(STEPS);
    // The result is long; start it at the top rather than mid-itinerary.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* Swapping to an alternative re-plans against that farm — a different farm
     runs different things at different hours, so keeping the first itinerary
     would show a trip nobody can actually have. The farm you came from stays in
     the alternatives, so the swap is reversible. */
  const active = useMemo<PlannerResult | null>(() => {
    if (!result) return null;
    if (!swapped) return result;
    const alternatives = [result.listing, ...result.alternatives.filter((item) => item.id !== swapped.id)].slice(0, 2);
    const replanned = planTrip([swapped], answers);
    if (replanned) return { ...replanned, alternatives };
    return {
      ...result,
      listing: swapped,
      itinerary: buildItinerary(swapped, answers),
      cost: computeCost(swapped, answers.guests),
      alternatives,
    };
  }, [result, swapped, answers]);

  const toggleInterest = (category: ActivityCategory) => {
    setAnswers((current) => ({
      ...current,
      interests: current.interests.includes(category)
        ? current.interests.filter((item) => item !== category)
        : [...current.interests, category],
    }));
  };

  const slide = {
    initial: (dir: number) => ({ opacity: 0, x: dir * 28 }),
    animate: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir * -28 }),
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-12 sm:px-6">
      <header className="mb-10">
        <h1 className="text-[clamp(1.9rem,4.4vw,2.8rem)] font-semibold tracking-[-0.03em]">{t('planner.title')}</h1>
        <p className="measure mt-3 text-[16px] leading-relaxed text-[var(--color-muted)]">{t('planner.sub')}</p>
      </header>

      {step < STEPS && (
        <div className="mb-8 flex items-center gap-3">
          <div className="flex gap-1.5">
            {Array.from({ length: STEPS }).map((_, index) => (
              <motion.span
                key={index}
                className="h-1.5 rounded-full bg-[var(--color-line-strong)]"
                animate={{
                  width: index === step ? 34 : 14,
                  backgroundColor: index <= step ? 'var(--color-leaf)' : 'var(--color-line-strong)',
                }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}
          </div>
          <span className="text-[13px] text-[var(--color-muted)]">
            {t('planner.step')} {step + 1} {t('planner.of')} {STEPS}
          </span>
        </div>
      )}

      <AnimatePresence mode="wait" custom={direction}>
        {step === 0 && (
          <motion.section key="s0" custom={direction} variants={slide} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
            <h2 className="text-[22px] font-semibold tracking-tight">{t('planner.q1')}</h2>
            <p className="mt-2 text-[15px] text-[var(--color-muted)]">{t('planner.q1sub')}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[{ slug: null as string | null }, ...regions.map((region) => ({ slug: region.slug }))].map((option) => {
                const region = regions.find((item) => item.slug === option.slug);
                const selected = answers.regionSlug === option.slug;
                return (
                  <button
                    key={option.slug ?? 'any'}
                    type="button"
                    onClick={() => setAnswers({ ...answers, regionSlug: option.slug })}
                    className="card card-hover overflow-hidden text-left transition"
                    style={selected ? { outline: '2px solid var(--color-leaf)', outlineOffset: '2px' } : undefined}
                  >
                    <div className="aspect-[16/9] overflow-hidden">
                      <Scene scene={region?.hero_scene ?? 'hills'} seed={option.slug ?? 'any-region'} className="h-full w-full" />
                    </div>
                    <div className="p-4">
                      <p className="text-[15px] font-medium">{region ? tx(region.name) : t('planner.anyRegion')}</p>
                      <p className="mt-1 text-[13px] text-[var(--color-muted)]">
                        {region ? tx(region.tagline) : t('planner.anyRegionSub')}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.section>
        )}

        {step === 1 && (
          <motion.section key="s1" custom={direction} variants={slide} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
            <h2 className="text-[22px] font-semibold tracking-tight">{t('planner.q2')}</h2>
            <p className="mt-2 text-[15px] text-[var(--color-muted)]">{t('planner.q2sub')}</p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label={t('planner.people')}>
                <div className="flex items-center gap-4">
                  <button type="button" className="btn btn-ghost h-12 w-12 p-0 text-xl" onClick={() => setAnswers({ ...answers, guests: Math.max(1, answers.guests - 1) })} aria-label="-">−</button>
                  <span className="min-w-10 text-center text-2xl font-semibold tabular-nums">{answers.guests}</span>
                  <button type="button" className="btn btn-ghost h-12 w-12 p-0 text-xl" onClick={() => setAnswers({ ...answers, guests: Math.min(16, answers.guests + 1) })} aria-label="+">+</button>
                </div>
              </Field>
              <Field label={t('planner.month')}>
                <select
                  className="field"
                  value={answers.month}
                  onChange={(event) => setAnswers({ ...answers, month: Number(event.target.value) })}
                >
                  {months.map((month, index) => (
                    <option key={month} value={index + 1}>{month}</option>
                  ))}
                </select>
              </Field>
            </div>
          </motion.section>
        )}

        {step === 2 && (
          <motion.section key="s2" custom={direction} variants={slide} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
            <h2 className="text-[22px] font-semibold tracking-tight">{t('planner.q3')}</h2>
            <p className="mt-2 text-[15px] text-[var(--color-muted)]">{t('planner.q3sub')}</p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  className="chip px-4 py-2.5 text-[15px]"
                  data-on={answers.interests.includes(category)}
                  onClick={() => toggleInterest(category)}
                >
                  {t(`categories.${category}`)}
                </button>
              ))}
            </div>
          </motion.section>
        )}

        {step === 3 && (
          <motion.section key="s3" custom={direction} variants={slide} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
            <h2 className="text-[22px] font-semibold tracking-tight">{t('planner.q4')}</h2>
            <p className="mt-2 text-[15px] text-[var(--color-muted)]">{t('planner.q4sub')}</p>
            <div className="mt-8">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] text-[var(--color-muted)]">{t('planner.budget')}</span>
                <span className="text-[26px] font-semibold tabular-nums">{money(answers.budget)}</span>
              </div>
              <input
                type="range" min={1500} max={4000} step={100}
                value={answers.budget}
                onChange={(event) => setAnswers({ ...answers, budget: Number(event.target.value) })}
                className="mt-3 w-full accent-[var(--color-leaf)]"
              />
              <div className="mt-8">
                <span className="mb-3 block text-[13px] text-[var(--color-muted)]">{t('planner.pace')}</span>
                <SegmentedControl
                  size="lg"
                  value={answers.pace}
                  onChange={(pace) => setAnswers({ ...answers, pace })}
                  segments={[
                    { value: 'easy', label: t('planner.paceEasy'), sub: t('planner.paceEasySub') },
                    { value: 'full', label: t('planner.paceFull'), sub: t('planner.paceFullSub') },
                  ]}
                />
              </div>
            </div>
          </motion.section>
        )}

        {step === STEPS && (
          <motion.section key="result" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
            {!active ? (
              <div className="card p-8">
                <p className="text-[16px]">{t('planner.noMatch')}</p>
                <button type="button" onClick={() => go(0)} className="btn btn-primary mt-6">
                  {t('planner.again')}
                </button>
              </div>
            ) : (
              <PlannerResultView
                result={active}
                answers={answers}
                onRestart={() => { setResult(null); go(0); }}
                onChange={() => go(3)}
                onSwap={(listing) => { setSwapped(listing); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              />
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {step < STEPS && (
        <div className="mt-10 flex items-center gap-3">
          {step > 0 && (
            <button type="button" onClick={() => go(step - 1)} className="btn btn-ghost">
              {t('common.back')}
            </button>
          )}
          {step < STEPS - 1 ? (
            <button type="button" onClick={() => go(step + 1)} className="btn btn-primary px-7">
              {t('common.next')}
            </button>
          ) : (
            <button type="button" onClick={build} className="btn btn-primary px-7">
              {t('planner.build')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PlannerResultView({
  result,
  answers,
  onRestart,
  onChange,
  onSwap,
}: {
  result: PlannerResult;
  answers: PlannerAnswers;
  onRestart: () => void;
  onChange: () => void;
  onSwap: (listing: Listing) => void;
}) {
  const { t, tx, money, list } = useIntl();
  const months = list('months');
  const { listing, itinerary, cost, reasons, alternatives } = result;

  const reasonText = (reason: PlannerResult['reasons'][number]): string => {
    switch (reason.kind) {
      case 'region': return t('planner.matchRegion');
      case 'budget': return t('planner.matchBudget');
      case 'group': return t('planner.matchGroup');
      case 'season': return `${t('planner.matchSeason')} ${months[answers.month - 1]}`;
      case 'interest': return `${t('planner.matchInterest')} ${t(`categories.${reason.detail}`)}`;
      default: return '';
    }
  };

  return (
    <>
      <div className="card overflow-hidden">
        <div className="relative aspect-[16/7]">
          <Scene scene={listing.scene} seed={listing.slug} className="h-full w-full" />
        </div>
        <div className="p-6 sm:p-8">
          <p className="text-[13px] uppercase tracking-[0.12em] text-[var(--color-muted)]">{t('planner.resultTitle')}</p>
          <h2 className="mt-2 text-[clamp(1.5rem,3.4vw,2.2rem)] font-semibold tracking-[-0.025em]">
            {tx(listing.host?.farm_name)}
          </h2>
          <p className="mt-1 text-[15px] text-[var(--color-muted)]">
            {tx(listing.village)}, {tx(DISTRICT_NAMES[listing.district]) || listing.district} · {tx(listing.region?.name)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {listing.review_count > 0 && <Stars rating={listing.rating} count={listing.review_count} />}
            <Pill tone="leaf">{money(listing.base_price)} {t('common.perPerson')}</Pill>
          </div>

          <h3 className="mt-6 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
            {t('planner.why')}
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {reasons.slice(0, 6).map((reason, index) => (
              <li key={`${reason.kind}-${reason.detail ?? index}`}>
                <Pill>{reasonText(reason)}</Pill>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={onChange} className="btn btn-outline text-sm">{t('planner.change')}</button>
            <button type="button" onClick={onRestart} className="btn btn-ghost text-sm">{t('planner.again')}</button>
            <Link href={`/farm/${listing.slug}`} className="btn btn-ghost text-sm">{t('packages.viewFarm')}</Link>
          </div>
        </div>
      </div>

      <section className="mt-12">
        <h3 className="mb-6 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
          {t('packages.dayPlan')}
        </h3>
        <Itinerary items={itinerary} />
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="card p-6">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
            {t('planner.cost')}
          </h3>
          <dl className="mt-4 space-y-2.5 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-[var(--color-muted)]">{t('planner.costStay')} × {answers.guests}</dt>
              <dd className="tabular-nums">{money(cost.stay)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-muted)]">{t('planner.costPlatform')}</dt>
              <dd className="tabular-nums text-[var(--color-muted)]">{money(cost.platformFee)}</dd>
            </div>
            <div className="flex justify-between border-t border-[var(--color-line)] pt-2.5 text-[17px] font-semibold">
              <dt>{t('planner.costTotal')}</dt>
              <dd className="tabular-nums">{money(cost.total)}</dd>
            </div>
            <div className="flex justify-between text-[14px] text-[var(--color-leaf)]">
              <dt>{t('planner.costFarmer')}</dt>
              <dd className="tabular-nums">{money(cost.farmerAmount)}</dd>
            </div>
          </dl>
        </div>

        <div className="card p-6">
          <BookingPanel listing={listing} itinerary={itinerary} variant="inline" />
        </div>
      </section>

      {alternatives.length > 0 && (
        <section className="mt-12">
          <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
            {t('planner.alternatives')}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {alternatives.map((option) => (
              <div key={option.id} className="card flex items-center gap-4 p-4">
                <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl">
                  <Scene scene={option.scene} seed={option.slug} className="h-full w-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium">{tx(option.host?.farm_name)}</p>
                  <p className="truncate text-[12px] text-[var(--color-muted)]">
                    {tx(option.village)} · {money(option.base_price)}
                  </p>
                </div>
                <button type="button" onClick={() => onSwap(option)} className="btn btn-ghost shrink-0 text-[13px]">
                  {t('planner.swap')}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
