import localFont from 'next/font/local';

/*
  Fonts are self-hosted from assets/fonts (latin woff2, pulled once from Google
  Fonts) rather than fetched through `next/font/google`.

  next/font/google downloads every declared family from fonts.gstatic.com at
  BUILD time, and a single failed fetch fails the whole build — which is exactly
  what happened in CI once this layout grew from two families to six to cover
  all three versions. Local files make the build hermetic: no network, no
  third-party uptime in the critical path, and identical output every run.

  Everything below is written out longhand because next/font rejects anything
  that is not an explicitly written literal — no shared fallback constants, no
  helper that builds the `src` array.

  The root layout still imports no stylesheet. Each version under app/v1,
  app/(v2) and app/v3 owns a complete design system of its own, and these
  variables are declared here on <html> because all three read them as :root
  custom properties.
*/

/* Used by V2 and V3 — V3 is served at `/`, so these two preload. */
const inter = localFont({
  src: [
    { path: '../assets/fonts/inter-400.woff2', weight: '400', style: 'normal' },
    { path: '../assets/fonts/inter-500.woff2', weight: '500', style: 'normal' },
    { path: '../assets/fonts/inter-600.woff2', weight: '600', style: 'normal' },
    { path: '../assets/fonts/inter-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-inter',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
});

const manrope = localFont({
  src: [
    { path: '../assets/fonts/manrope-500.woff2', weight: '500', style: 'normal' },
    { path: '../assets/fonts/manrope-600.woff2', weight: '600', style: 'normal' },
    { path: '../assets/fonts/manrope-700.woff2', weight: '700', style: 'normal' },
    { path: '../assets/fonts/manrope-800.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-manrope',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
});

/* V1's display set. `preload: false` keeps the @font-face rules on every page
   while leaving the files unfetched until a route actually renders them. */
const anton = localFont({
  src: [{ path: '../assets/fonts/anton-400.woff2', weight: '400', style: 'normal' }],
  variable: '--font-anton',
  display: 'swap',
  preload: false,
  fallback: ['Impact', 'Haettenschweiler', 'sans-serif'],
});

const chakra = localFont({
  src: [
    { path: '../assets/fonts/chakra-petch-500.woff2', weight: '500', style: 'normal' },
    { path: '../assets/fonts/chakra-petch-600.woff2', weight: '600', style: 'normal' },
    { path: '../assets/fonts/chakra-petch-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-chakra',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
});

const jetbrains = localFont({
  src: [
    { path: '../assets/fonts/jetbrains-mono-400.woff2', weight: '400', style: 'normal' },
    { path: '../assets/fonts/jetbrains-mono-600.woff2', weight: '600', style: 'normal' },
    { path: '../assets/fonts/jetbrains-mono-800.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-jetbrains',
  display: 'swap',
  preload: false,
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
});

const grotesk = localFont({
  src: [
    { path: '../assets/fonts/space-grotesk-400.woff2', weight: '400', style: 'normal' },
    { path: '../assets/fonts/space-grotesk-500.woff2', weight: '500', style: 'normal' },
    { path: '../assets/fonts/space-grotesk-600.woff2', weight: '600', style: 'normal' },
    { path: '../assets/fonts/space-grotesk-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-grotesk',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
});

const fontVariables = [inter, manrope, anton, chakra, jetbrains, grotesk].map((font) => font.variable).join(' ');

export const metadata = {
  metadataBase: new URL('https://gaurav-portfolio-topaz.vercel.app'),
  title: {
    default: 'Gaurav Suryavanshi | LLM Automation & AI Testing Engineer',
    template: '%s | Gaurav Suryavanshi',
  },
  description:
    'Portfolio of Gaurav Suryavanshi — building LLM automation flows (agentic pipelines, document extraction, model gateways) and the AI testing that keeps them honest: evaluation in CI, grounding checks, and red-teaming. Also SDET and API automation with Java 17, TestNG, and Rest-Assured.',
  keywords: [
    'LLM Application Engineer',
    'LLM Automation',
    'AI Testing',
    'LLM Evaluation',
    'Prompt Injection',
    'Red Teaming',
    'RAG Evaluation',
    'Agentic Workflows',
    'SDET',
    'API Automation',
    'Rest-Assured',
    'TestNG',
    'Java',
    'CI/CD',
  ],
  authors: [{ name: 'Gaurav Suryavanshi' }],
  creator: 'Gaurav Suryavanshi',
  openGraph: {
    title: 'Gaurav Suryavanshi | LLM Automation & AI Testing Engineer',
    description:
      'LLM automation flows and the testing that keeps them honest — agentic pipelines, RAG evaluation, guardrails, red-teaming, and API test automation.',
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
