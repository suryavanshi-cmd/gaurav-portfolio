'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useIntl } from '@/i18n/provider';
import { Field } from './ui/Field';
import { SegmentedControl } from './ui/SegmentedControl';
import { createClient } from '@/lib/supabase/client';

/* Phone OTP first, email second.

   A farmer in Sindhudurg has a phone number they answer and often no email they
   check, so the host portal opens on the phone tab and the traveller portal
   offers both. Either way there is no password: Supabase sends a six-digit
   code and the trigger on auth.users creates the profile with the role this
   form passes. */
export function AuthForm({ role = 'traveler' }: { role?: 'traveler' | 'host' }) {
  const { t, locale } = useIntl();
  const router = useRouter();
  const supabase = createClient();

  const [channel, setChannel] = useState<'phone' | 'email'>(role === 'host' ? 'phone' : 'phone');
  const [target, setTarget] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!supabase) {
    return (
      <div className="card p-7">
        <h1 className="text-[22px] font-semibold tracking-tight">{t('auth.title')}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-muted)]">{t('auth.notConfigured')}</p>
      </div>
    );
  }

  async function sendCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const client = supabase!;
    const options = { data: { role, preferred_language: locale }, shouldCreateUser: true };
    const { error: sendError } = channel === 'phone'
      ? await client.auth.signInWithOtp({ phone: target, options })
      : await client.auth.signInWithOtp({ email: target, options });
    setBusy(false);
    if (sendError) setError(sendError.message);
    else setSent(true);
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const client = supabase!;
    const { error: verifyError } = channel === 'phone'
      ? await client.auth.verifyOtp({ phone: target, token: code, type: 'sms' })
      : await client.auth.verifyOtp({ email: target, token: code, type: 'email' });
    setBusy(false);
    if (verifyError) {
      setError(t('auth.failed'));
      return;
    }
    router.push(role === 'host' ? '/shetkari/dashboard' : '/trips');
    router.refresh();
  }

  return (
    <div className="card p-7">
      <h1 className="text-[22px] font-semibold tracking-tight">{t('auth.title')}</h1>
      <p className="mt-2 text-[15px] text-[var(--color-muted)]">
        {role === 'host' ? t('auth.subHost') : t('auth.subTraveler')}
      </p>

      <div className="mt-5">
        <SegmentedControl
          value={channel}
          onChange={(next) => { setChannel(next); setSent(false); setTarget(''); }}
          segments={[
            { value: 'phone', label: t('auth.usePhone') },
            { value: 'email', label: t('auth.useEmail') },
          ]}
        />
      </div>

      <AnimatePresence mode="wait">
        {!sent ? (
          <motion.form key="send" onSubmit={sendCode} className="mt-5 space-y-4"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Field label={channel === 'phone' ? t('auth.phone') : t('auth.email')}>
              <input
                required
                className="field"
                type={channel === 'phone' ? 'tel' : 'email'}
                inputMode={channel === 'phone' ? 'tel' : 'email'}
                placeholder={channel === 'phone' ? '+91 98765 43210' : 'you@example.com'}
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                autoComplete={channel === 'phone' ? 'tel' : 'email'}
              />
            </Field>
            {error && <p className="text-[13px] text-[var(--color-clay)]">{error}</p>}
            <button type="submit" disabled={busy} className="btn btn-primary w-full py-3.5">
              {busy ? t('auth.sending') : t('auth.sendCode')}
            </button>
          </motion.form>
        ) : (
          <motion.form key="verify" onSubmit={verify} className="mt-5 space-y-4"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-[14px] text-[var(--color-muted)]">{t('auth.sentTo', { target })}</p>
            <Field label={t('auth.code')}>
              <input
                required
                className="field text-center text-2xl tracking-[0.4em] tabular-nums"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                autoComplete="one-time-code"
              />
            </Field>
            {error && <p className="text-[13px] text-[var(--color-clay)]">{error}</p>}
            <button type="submit" disabled={busy || code.length < 6} className="btn btn-primary w-full py-3.5">
              {t('auth.verify')}
            </button>
            <button type="button" onClick={() => setSent(false)} className="btn btn-ghost w-full">
              {t('auth.resend')}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
