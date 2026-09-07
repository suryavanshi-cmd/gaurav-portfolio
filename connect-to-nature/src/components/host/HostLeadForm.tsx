'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { useIntl } from '@/i18n/provider';
import { Field } from '../ui/Field';
import type { Region } from '@/lib/types';

/* The shortest useful form on the platform: a name and a number. Everything
   else is optional, because the point is to get a call started, not to make a
   farmer fill in a listing on a phone keyboard before anyone has spoken to
   them. */
export function HostLeadForm({ regions }: { regions: Region[] }) {
  const { t, tx, locale } = useIntl();
  const [form, setForm] = useState({
    name: '', phone: '', village: '', district: '', regionSlug: regions[0]?.slug ?? '',
    landAcres: '', beds: '', crops: '',
  });
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (code) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-7">
        <h3 className="text-[22px] font-semibold tracking-tight">{t('host.leadDone', { name: form.name })}</h3>
        <p className="mt-3 text-[16px] leading-relaxed text-[var(--color-ink-2)]">
          {t('host.leadDoneBody', { phone: form.phone, code })}
        </p>
        <button
          type="button"
          className="btn btn-outline mt-6 py-3.5 text-[16px]"
          onClick={() => { setCode(null); setForm({ ...form, name: '', phone: '' }); }}
        >
          {t('host.another')}
        </button>
      </motion.div>
    );
  }

  return (
    <form
      className="card space-y-5 p-6 sm:p-8"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const response = await fetch('/api/host-leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: form.name,
              phone: form.phone,
              village: form.village || undefined,
              district: form.district || undefined,
              regionSlug: form.regionSlug || undefined,
              landAcres: form.landAcres ? Number(form.landAcres) : undefined,
              beds: form.beds ? Number(form.beds) : undefined,
              crops: form.crops || undefined,
              language: locale,
            }),
          });
          const payload = await response.json();
          if (!response.ok) throw new Error('failed');
          setCode(payload.lead.code);
        } catch {
          setError(t('common.error'));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <h3 className="text-[22px] font-semibold tracking-tight">{t('host.leadTitle')}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-muted)]">{t('host.leadSub')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('host.name')}>
          <input required className="field py-3.5 text-[17px]" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
        </Field>
        <Field label={t('host.phone')}>
          <input required type="tel" inputMode="tel" className="field py-3.5 text-[17px]" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" />
        </Field>
        <Field label={t('host.village')}>
          <input className="field py-3.5 text-[17px]" value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} />
        </Field>
        <Field label={t('host.region')}>
          <select className="field py-3.5 text-[17px]" value={form.regionSlug} onChange={(e) => setForm({ ...form, regionSlug: e.target.value })}>
            {regions.map((region) => (
              <option key={region.id} value={region.slug}>{tx(region.name)}</option>
            ))}
          </select>
        </Field>
        <Field label={t('host.land')}>
          <input type="number" min={0} step="0.5" className="field py-3.5 text-[17px]" value={form.landAcres} onChange={(e) => setForm({ ...form, landAcres: e.target.value })} />
        </Field>
        <Field label={t('host.beds')}>
          <input type="number" min={0} className="field py-3.5 text-[17px]" value={form.beds} onChange={(e) => setForm({ ...form, beds: e.target.value })} />
        </Field>
        <Field label={t('host.crops')} className="sm:col-span-2">
          <input className="field py-3.5 text-[17px]" placeholder={t('host.cropsPlaceholder')} value={form.crops} onChange={(e) => setForm({ ...form, crops: e.target.value })} />
        </Field>
      </div>

      {error && <p className="text-[14px] text-[var(--color-clay)]">{error}</p>}

      <button type="submit" disabled={busy} className="btn btn-primary w-full py-4 text-[17px]">
        {busy ? t('common.saving') : t('host.sendDetails')}
      </button>
    </form>
  );
}
