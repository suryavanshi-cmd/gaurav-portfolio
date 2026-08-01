import { Anton, Chakra_Petch, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';
import './modern-responsive.css';
import './hyperdrive.css';
import HyperFX from '../components/HyperFX';
import LearningsLauncher from '../components/LearningsLauncher';

/* Self-hosted via next/font: no render-blocking request to fonts.googleapis.com,
   and each family gets a metric-matched fallback so the swap does not shift layout. */
const anton = Anton({ subsets: ['latin'], weight: '400', variable: '--font-anton', display: 'swap' });
const chakra = Chakra_Petch({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-chakra', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '600', '800'], variable: '--font-jetbrains', display: 'swap' });
const grotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-grotesk', display: 'swap' });

const fontVariables = `${anton.variable} ${chakra.variable} ${jetbrains.variable} ${grotesk.variable}`;

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
  // The site boots into the dark theme regardless of OS preference.
  themeColor: '#070a0f',
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
