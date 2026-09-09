import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { SiteNav } from '@/components/SiteNav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Reel Analyzer',
  description:
    'Paste an Instagram reel or upload the file, and get a structured read on its hook, structure, tone and what made it travel.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <SiteNav />
        <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:px-6">{children}</main>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
