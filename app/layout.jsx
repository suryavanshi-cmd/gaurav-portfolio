import { Anton, Chakra_Petch, Inter, JetBrains_Mono, Manrope, Space_Grotesk } from 'next/font/google';

/*
  The root layout deliberately imports NO stylesheet. Each version under
  app/(v2)/ and app/v1/ owns a complete global design system, and loading two
  of them into one document would have them fight over the same selectors.

  Fonts are the exception and have to live here, because both versions read
  them as custom properties off :root and a nested layout can only put them on
  a wrapper element. V1's four display families carry `preload: false`, so the
  @font-face rules ship on every page but the font files themselves are only
  fetched on the version that actually renders them.
*/
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-inter', display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-manrope', display: 'swap' });

const anton = Anton({ subsets: ['latin'], weight: '400', variable: '--font-anton', display: 'swap', preload: false });
const chakra = Chakra_Petch({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-chakra', display: 'swap', preload: false });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '600', '800'], variable: '--font-jetbrains', display: 'swap', preload: false });
const grotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-grotesk', display: 'swap', preload: false });

const fontVariables = [inter, manrope, anton, chakra, jetbrains, grotesk].map((font) => font.variable).join(' ');

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
      <body>{children}</body>
    </html>
  );
}
