import './globals.css';
import './modern-responsive.css';
import './hyperdrive.css';
import HyperFX from '../components/HyperFX';
import LearningsLauncher from '../components/LearningsLauncher';

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Anton&family=Chakra+Petch:wght@500;600;700&family=JetBrains+Mono:wght@400;600;800&family=Space+Grotesk:wght@400;500;600;700&display=swap';

export const metadata = {
  metadataBase: new URL('https://gaurav-portfolio-topaz.vercel.app'),
  title: {
    default: 'Gaurav Suryavanshi | Forward Deployment Engineer',
    template: '%s | Gaurav Suryavanshi',
  },
  description:
    'Portfolio of Gaurav Suryavanshi — Forward Deployment Engineer building LLM applications, API automation platforms, developer tools, and production-ready Next.js systems.',
  keywords: [
    'Forward Deployment Engineer',
    'LLM Application Engineer',
    'Next.js Developer',
    'API Automation',
    'Supabase',
    'Vercel',
    'Apache HTTP Server',
  ],
  authors: [{ name: 'Gaurav Suryavanshi' }],
  creator: 'Gaurav Suryavanshi',
  openGraph: {
    title: 'Gaurav Suryavanshi | Forward Deployment Engineer',
    description:
      'LLM applications, complex API automation, developer tooling, observability, and production delivery.',
    url: '/',
    siteName: 'Gaurav Suryavanshi Portfolio',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#070a0f' },
    { media: '(prefers-color-scheme: light)', color: '#f4f0e8' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONT_HREF} />
      </head>
      <body>
        <HyperFX />
        {children}
        <LearningsLauncher />
      </body>
    </html>
  );
}
