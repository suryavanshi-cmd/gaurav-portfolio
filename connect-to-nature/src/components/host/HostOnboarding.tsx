'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { useIntl } from '@/i18n/provider';
import { Field } from '../ui/Field';
import { Scene } from '../Scene';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { createClient } from '@/lib/supabase/client';
import { STAY_TYPES } from '@/lib/seed-content';
import type { Activity, Region } from '@/lib/types';

const SCENES = ['orchard', 'coast', 'vineyard', 'hills', 'river', 'plateau'];

interface Draft {
  hostName: string; farmName: string; village: string; district: string; regionSlug: string;
  phone: string; landAcres: string; bio: string;
  title: string; description: string; stayType: string; scene: string;
  bedrooms: string; maxGuests: string; basePrice: string;
  activitySlugs: string[]; payoutUpi: string;
}

/* Five steps, one screen each, and nothing asked twice. The order matters: the
   questions a farmer can answer without thinking come first, and the bank
   details come last, once they have seen what the page will look like. */
export function HostOnboarding({
  regions,
  activities,
  demo,
  signedIn,
}: {
  regions: Region[];
  activities: Activity[];
  demo: boolean;
  signedIn: boolean;
}) {
  const { t, tx, locale, money } = useIntl();
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [openDates, setOpenDates] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [draft, setDraft] = useState<Draft>({
    hostName: '', farmName: '', village: '', district: '', regionSlug: regions[0]?.slug ?? '',
    phone: '', landAcres: '', bio: '',
    title: '', description: '', stayType: 'farm_cottage', scene: 'orchard',
    bedrooms: '2', maxGuests: '6', basePrice: '2200',
    activitySlugs: [], payoutUpi: '',
  });

  const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const steps = [t('host.step1'), t('host.step2'), t('host.step3'), t('host.step4'), t('host.step5')];

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/host/listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostName: draft.hostName,
          farmName: draft.farmName,
          village: draft.village,
          district: draft.district,
          regionSlug: draft.regionSlug,
          phone: draft.phone,
          landAcres: draft.landAcres ? Number(draft.landAcres) : undefined,
          bio: draft.bio || undefined,
          title: draft.title,
          description: draft.description,
          stayType: draft.stayType,
          scene: draft.scene,
          basePrice: Number(draft.basePrice),
          maxGuests: Number(draft.maxGuests),
          bedrooms: Number(draft.bedrooms),
          activitySlugs: draft.activitySlugs,
          languages: [locale],
          payoutUpi: draft.payoutUpi || undefined,
          language: locale,
        }),
      });

      if (response.status === 401) {
        setError(t('auth.mustSignIn'));
        return;
      }
      const payload = await response.json();
      if (!response.ok) {
        setError(t('common.error'));
        return;
      }

      // Photos and the opened dates need the listing to exist first, so they
      // are written after it comes back.
      const listingId: string | undefined = payload.listing?.id;
      const supabase = createClient();
      if (supabase && listingId) {
        if (files.length > 0) {
          const uploaded = await Promise.all(
            files.map(async (file, index) => {
              const path = `${listingId}/${Date.now()}-${index}-${file.name.replace(/[^\w.-]/g, '')}`;
              const { error: uploadError } = await supabase.storage.from('listing-photos').upload(path, file);
              if (uploadError) return null;
              const { data } = supabase.storage.from('listing-photos').getPublicUrl(path);
              return { listing_id: listingId, url: data.publicUrl, position: index };
            }),
          );
          const rows = uploaded.filter((row): row is { listing_id: string; url: string; position: number } => row !== null);
          if (rows.length) await supabase.from('listing_photos').insert(rows);
        }

        if (openDates.length > 0) {
          await fetch('/api/host/availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ listingId, dates: openDates, isAvailable: true }),
          });
        }
      }

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError(t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="card p-8">
        <h1 className="text-[26px] font-semibold tracking-tight">{t('host.submitted')}</h1>
        <p className="mt-3 text-[17px] leading-relaxed text-[var(--color-ink-2)]">
          {t('host.submittedBody', { phone: draft.phone })}
        </p>
        <Link href="/shetkari/dashboard" className="btn btn-primary mt-7 py-4 text-[17px]">
          {t('host.dashboard')}
        </Link>
      </motion.div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center gap-3">
        {steps.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(index)}
            className={`rounded-full px-4 py-2 text-[14px] transition-all duration-300 cursor-pointer ${
              index === step
                ? 'bg-[var(--color-leaf)] text-white'
                : index < step
                  ? 'bg-[var(--color-leaf-soft)] text-[var(--color-leaf)]'
                  : 'bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)] text-[var(--color-muted)]'
            }`}
          >
            {index + 1}. {label}
          </button>
        ))}
      </div>

      {!signedIn && !demo && (
        <p className="mb-6 rounded-2xl bg-[var(--color-surface-2)] p-4 text-[15px]">
          {t('auth.mustSignIn')} <Link href="/shetkari/signin" className="underline underline-offset-4">{t('host.signIn')}</Link>
        </p>
      )}

      <div className="card p-6 sm:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === 0 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={t('host.name')}>
                  <input className="field py-3.5 text-[17px]" value={draft.hostName} onChange={(e) => set({ hostName: e.target.value })} />
                </Field>
                <Field label={t('host.farmName')}>
                  <input className="field py-3.5 text-[17px]" value={draft.farmName} onChange={(e) => set({ farmName: e.target.value })} />
                </Field>
                <Field label={t('host.village')}>
                  <input className="field py-3.5 text-[17px]" value={draft.village} onChange={(e) => set({ village: e.target.value })} />
                </Field>
                <Field label={t('host.district')}>
                  <input className="field py-3.5 text-[17px]" value={draft.district} onChange={(e) => set({ district: e.target.value })} />
                </Field>
                <Field label={t('host.region')}>
                  <select className="field py-3.5 text-[17px]" value={draft.regionSlug} onChange={(e) => set({ regionSlug: e.target.value })}>
                    {regions.map((region) => (
                      <option key={region.id} value={region.slug}>{tx(region.name)}</option>
                    ))}
                  </select>
                </Field>
                <Field label={t('host.phone')}>
                  <input type="tel" className="field py-3.5 text-[17px]" value={draft.phone} onChange={(e) => set({ phone: e.target.value })} />
                </Field>
                <Field label={t('host.land')}>
                  <input type="number" min={0} step="0.5" className="field py-3.5 text-[17px]" value={draft.landAcres} onChange={(e) => set({ landAcres: e.target.value })} />
                </Field>
                <Field label={t('host.farmTitle')} className="sm:col-span-2">
                  <input className="field py-3.5 text-[17px]" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
                </Field>
                <Field label={t('host.farmDescription')} className="sm:col-span-2">
                  <textarea rows={4} className="field resize-none py-3.5 text-[17px]" value={draft.description} onChange={(e) => set({ description: e.target.value })} />
                </Field>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label={t('host.stayType')}>
                    <select className="field py-3.5 text-[17px]" value={draft.stayType} onChange={(e) => set({ stayType: e.target.value })}>
                      {Object.entries(STAY_TYPES).map(([key, label]) => (
                        <option key={key} value={key}>{tx(label)}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t('host.bedrooms')}>
                    <input type="number" min={1} className="field py-3.5 text-[17px]" value={draft.bedrooms} onChange={(e) => set({ bedrooms: e.target.value })} />
                  </Field>
                  <Field label={t('host.maxGuests')}>
                    <input type="number" min={1} className="field py-3.5 text-[17px]" value={draft.maxGuests} onChange={(e) => set({ maxGuests: e.target.value })} />
                  </Field>
                </div>

                <div>
                  <span className="mb-2 block text-[13px] font-medium text-[var(--color-ink-2)]">{t('host.photos')}</span>
                  <p className="mb-3 text-[14px] text-[var(--color-muted)]">{t('host.photosNote')}</p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
                    className="field py-3 text-[15px]"
                  />
                  {files.length > 0 && (
                    <ul className="mt-3 space-y-1 text-[14px] text-[var(--color-muted)]">
                      {files.map((file) => <li key={file.name}>· {file.name}</li>)}
                    </ul>
                  )}
                </div>

                <div>
                  <span className="mb-3 block text-[13px] font-medium text-[var(--color-ink-2)]">
                    {t('host.photos')} — {t('common.all')}
                  </span>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {SCENES.map((scene) => (
                      <button
                        key={scene}
                        type="button"
                        onClick={() => set({ scene })}
                        className="overflow-hidden rounded-2xl border transition"
                        style={{
                          borderColor: draft.scene === scene ? 'var(--color-leaf)' : 'var(--color-line)',
                          borderWidth: draft.scene === scene ? 2 : 1,
                        }}
                      >
                        <Scene scene={scene} seed={scene} className="aspect-[4/3] w-full" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <p className="mb-4 text-[16px] text-[var(--color-ink-2)]">{t('host.activities')}</p>
                <div className="flex flex-wrap gap-2.5">
                  {activities.map((activity) => (
                    <button
                      key={activity.id}
                      type="button"
                      className="chip px-4 py-2.5 text-[15px]"
                      data-on={draft.activitySlugs.includes(activity.slug)}
                      onClick={() =>
                        set({
                          activitySlugs: draft.activitySlugs.includes(activity.slug)
                            ? draft.activitySlugs.filter((slug) => slug !== activity.slug)
                            : [...draft.activitySlugs, activity.slug],
                        })
                      }
                    >
                      {tx(activity.name)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8">
                <Field label={t('host.price')}>
                  <div className="flex items-center gap-4">
                    <input
                      type="range" min={800} max={6000} step={50}
                      value={draft.basePrice}
                      onChange={(e) => set({ basePrice: e.target.value })}
                      className="flex-1 accent-[var(--color-leaf)]"
                    />
                    <span className="w-28 text-right text-[22px] font-semibold tabular-nums">
                      {money(Number(draft.basePrice))}
                    </span>
                  </div>
                </Field>
                <div>
                  <span className="mb-3 block text-[13px] font-medium text-[var(--color-ink-2)]">{t('host.openDates')}</span>
                  <AvailabilityCalendar openDates={openDates} onChange={setOpenDates} days={30} />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={t('host.payoutUpi')} className="sm:col-span-2">
                  <input className="field py-3.5 text-[17px]" placeholder="name@bank" value={draft.payoutUpi} onChange={(e) => set({ payoutUpi: e.target.value })} />
                </Field>
                <p className="text-[15px] leading-relaxed text-[var(--color-muted)] sm:col-span-2">
                  {t('host.p4sub')}
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {error && <p className="mt-5 text-[15px] text-[var(--color-clay)]">{error}</p>}

        <div className="mt-8 flex items-center gap-3">
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} className="btn btn-ghost py-3.5 text-[16px]">
              {t('common.back')}
            </button>
          )}
          {step < steps.length - 1 ? (
            <button type="button" onClick={() => setStep(step + 1)} className="btn btn-primary px-7 py-3.5 text-[16px]">
              {t('common.next')}
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={busy} className="btn btn-primary px-7 py-3.5 text-[16px]">
              {busy ? t('common.saving') : t('host.submitForApproval')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
