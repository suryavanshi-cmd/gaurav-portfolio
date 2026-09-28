import localFont from 'next/font/local';
import './css/tokens.css';
import './css/layout.css';
import './css/pages.css';
import './css/lab.css';
import './css/ported.css';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import PhysicsField from '../components/PhysicsField';
import Chat from '../components/Chat';
import JsonLd from '../components/JsonLd';
import { RevealOnRoute } from '../components/ui';
import { PERSON, SITE, SITE_URL } from '../components/site';

/*
  Fonts are self-hosted (see assets/fonts/README.md) so the build makes no
  network requests. Each file is a variable font, declared with the weight
  range it covers. next/font only accepts written-out literals here.
*/
const inter = localFont({
  src: [{ path: '../assets/fonts/inter-var.woff2', weight: '400 700', style: 'normal' }],
  variable: '--font-inter',
  display: 'swap',
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
});

const jetbrains = localFont({
  src: [{ path: '../assets/fonts/jetbrains-mono-var.woff2', weight: '400 800', style: 'normal' }],
  variable: '--font-jetbrains',
  display: 'swap',
  preload: false,
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE.title,
    template: '%s — Gaurav Suryavanshi',
  },
  description: SITE.description,
  keywords: SITE.keywords,
  applicationName: 'Gaurav Suryavanshi',
  authors: [{ name: PERSON.name, url: SITE_URL }],
  creator: PERSON.name,
  publisher: PERSON.name,
  category: 'technology',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: '/',
    siteName: 'Gaurav Suryavanshi',
    title: SITE.title,
    description: SITE.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE.title,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  formatDetection: { telephone: false },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#fbfbfd',
};

/* Runs before first paint.

   Motion: arms the entrance animations only when the visitor has not asked for
   reduced motion. Without the flag every [data-rise] element renders plainly
   visible, so a blocked script degrades to a static page, never a blank one.

   Theme: applies a stored light/dark choice before anything is painted — doing
   it in an effect would flash the wrong colours on every load. With no stored
   choice the attribute stays off and the stylesheet follows the OS. */
const bootScript = `(function(){try{
  var d=document.documentElement;
  if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){d.dataset.motion='1';}
  var t=null;try{t=localStorage.getItem('theme');}catch(e){}
  if(t==='light'||t==='dark'){d.dataset.theme=t;}
  var dark=(t==='dark')||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  var m=document.querySelector('meta[name="theme-color"]');
  if(m){m.setAttribute('content',dark?'#000000':'#fbfbfd');}
}catch(e){}})();`;

const personLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Person',
      '@id': `${SITE_URL}/#person`,
      name: PERSON.name,
      url: SITE_URL,
      email: `mailto:${PERSON.email}`,
      jobTitle: PERSON.role,
      worksFor: { '@type': 'Organization', name: PERSON.employer },
      address: { '@type': 'PostalAddress', addressLocality: PERSON.city, addressCountry: 'IN' },
      alumniOf: { '@type': 'CollegeOrUniversity', name: 'PCCOER, Pune' },
      sameAs: [PERSON.github],
      knowsAbout: ['API test automation', 'Rest-Assured', 'TestNG', 'Java', 'Node.js', 'NestJS', 'Oracle SQL', 'LLM testing', 'Retrieval-augmented generation'],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'Gaurav Suryavanshi',
      description: SITE.description,
      inLanguage: 'en-IN',
      publisher: { '@id': `${SITE_URL}/#person` },
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        <a href="#main" className="skip">Skip to content</a>
        <PhysicsField />
        <SiteNav />
        {children}
        <SiteFooter />
        <Chat />
        <RevealOnRoute />
        <JsonLd data={personLd} />
      </body>
    </html>
  );
}
