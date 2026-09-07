import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PackageDetail } from '@/components/PackageDetail';
import { getPackage } from '@/lib/queries';
import { getLocale } from '@/i18n/server';
import { pickText } from '@/i18n/dictionaries';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [pkg, locale] = await Promise.all([getPackage(slug), getLocale()]);
  if (!pkg) return {};
  return { title: pickText(pkg.title, locale), description: pickText(pkg.summary, locale).slice(0, 180) };
}

export default async function PackagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pkg = await getPackage(slug);
  if (!pkg) notFound();
  return <PackageDetail pkg={pkg} />;
}
