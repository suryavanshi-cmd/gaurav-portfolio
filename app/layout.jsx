import { Inter, Manrope } from 'next/font/google';
import './globals.css';
import './modern-responsive.css';
import './hyperdrive.css';
import './performance.css';
import HyperFX from '../components/HyperFX';
import LearningsLauncher from '../components/LearningsLauncher';

/* Self-hosted via next/font: no render-blocking request to fonts.googleapis.com,
   and each family gets a metric-matched fallback so the swap does not shift layout. */
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-inter', display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-manrope', display: 'swap' });

const fontVariables = `${inter.variable} ${manrope.variable}`;

export const metadata = {
  metadataBase: new URL('https://gaurav-portfolio-topaz.vercel.app'),
  title: {
    default: 'Gaurav Suryavanshi | SDET & API Automation Engineer',
    template: '%s | Gaurav Suryavanshi',
  },
  description:
    'Portfolio of Gaurav Suryavanshi — SDET building API test-automation frameworks for large-scale claims systems with Java 17, TestNG, Rest-Assured, Oracle SQL, LLM workflows, and CI/CD.',
  keywords: [
    'SDET',
    'API Automation',
    'Rest-Assured',
    'TestNG',
    'Java',
    'LLM Application Engineer',
    'Next.js Developer',
    'Oracle SQL',
    'CI/CD',
  ],
  authors: [{ name: 'Gaurav Suryavanshi' }],
  creator: 'Gaurav Suryavanshi',
  openGraph: {
    title: 'Gaurav Suryavanshi | SDET & API Automation Engineer',
    description:
      'API test automation, LLM-enabled workflows, developer tooling, observability, and production delivery.',
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
  themeColor: '#ffffff',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <body>
        <HyperFX />
        {children}
        <LearningsLauncher />
      </body>
    </html>
  );
}
