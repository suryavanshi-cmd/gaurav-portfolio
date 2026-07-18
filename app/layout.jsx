import './globals.css';
import './modern-responsive.css';

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
      <body>{children}</body>
    </html>
  );
}
