'use client';

import { useEffect, useState } from 'react';
import { SegmentedControl } from './ui/SegmentedControl';
import { useIntl } from '@/i18n/provider';

type Theme = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'ctn.theme';

/* System is a real option, not a gap: without it, someone who just wants to
   follow their phone has no way back once they have touched the control. */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { t } = useIntl();
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (saved) setTheme(saved);
    } catch {
      /* private mode */
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
      document.documentElement.dataset.theme = resolved;
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  const choose = (next: Theme) => {
    setTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode */
    }
  };

  return (
    <SegmentedControl
      ariaLabel={t('nav.appearance')}
      size={compact ? 'sm' : 'sm'}
      value={theme}
      onChange={choose}
      segments={[
        { value: 'light', label: '☀' },
        { value: 'dark', label: '☾' },
        { value: 'system', label: 'A' },
      ]}
    />
  );
}
