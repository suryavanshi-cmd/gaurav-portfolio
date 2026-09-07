import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { LOCALE_META } from '@/i18n/config';
import { getLocale } from '@/i18n/server';
import { translate } from '@/i18n/dictionaries';
import { IntlProvider } from '@/i18n/provider';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: {
      default: `${translate(locale, 'common.brand')} — ${translate(locale, 'common.tagline')}`,
      template: `%s · ${translate(locale, 'common.brand')}`,
    },
    description: translate(locale, 'hero.sub'),
    applicationName: translate(locale, 'common.brand'),
    other: { 'format-detection': 'telephone=no' },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfbfd' },
    { media: '(prefers-color-scheme: dark)', color: '#08090b' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/* Resolve the theme before first paint. Without this, a dark-mode visitor gets
   a white flash on every navigation that misses the bfcache. */
const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem('ctn.theme')||'system';var d=s==='dark'||(s==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){document.documentElement.dataset.theme='light';}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const headerList = await headers();
  const portal = headerList.get('x-ctn-portal') === 'host' ? 'host' : 'customer';

  return (
    <html lang={LOCALE_META[locale].htmlLang} data-portal={portal} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <IntlProvider initialLocale={locale}>{children}</IntlProvider>
      </body>
    </html>
  );
}
