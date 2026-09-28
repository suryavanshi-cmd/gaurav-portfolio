import Link from 'next/link';
import { notFound } from 'next/navigation';
import JsonLd from '../../../components/JsonLd';
import LabTool from '../../../components/lab/LabTool';
import { DemoCard } from '../../../components/cards';
import { SpotlightGroup } from '../../../components/ui';
import { LAB, labBySlug } from '../../../components/lab/registry';
import { postsBySlug } from '../../../components/posts';
import { PERSON, SITE_URL } from '../../../components/site';

export function generateStaticParams() {
  return LAB.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const tool = labBySlug[slug];
  if (!tool) return {};
  return {
    title: `${tool.title} — live demo`,
    description: tool.note,
    keywords: [...tool.tags, 'live demo', 'interactive'],
    alternates: { canonical: `/lab/${tool.slug}` },
    openGraph: { url: `/lab/${tool.slug}`, title: `${tool.title} — live demo`, description: tool.note },
  };
}

export default async function LabToolPage({ params }) {
  const { slug } = await params;
  const tool = labBySlug[slug];
  if (!tool) notFound();

  const post = tool.post ? postsBySlug[tool.post] : null;
  const others = LAB.filter((t) => t.slug !== slug).slice(0, 3);

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: tool.title,
    description: tool.note,
    url: `${SITE_URL}/lab/${tool.slug}`,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any (runs in the browser)',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
    author: { '@type': 'Person', name: PERSON.name, url: SITE_URL },
  };

  return (
    <main id="main">
      <header className="page-head" style={{ paddingBottom: 32 }}>
        <div className="lab-wrap">
          <Link href="/lab" className="crumb">‹ All demos</Link>
          <div className="detail-meta" data-rise>
            <span className="badge badge-live"><span className="live-dot" aria-hidden="true" />Live</span>
            <span className="muted" style={{ fontSize: 14 }}>{tool.tags.join(' · ')}</span>
          </div>
          <h1 className="headline" data-rise style={{ '--rise': 1 }}>{tool.title}</h1>
          <p className="lede" data-rise style={{ '--rise': 2 }}>{tool.note}</p>
        </div>
      </header>

      <section className="solid" style={{ paddingBottom: 56 }}>
        <div className="lab-wrap">
          <LabTool slug={tool.slug} />
        </div>
      </section>

      <section className="solid section-tight" aria-labelledby="how-title">
        <div className="lab-wrap" style={{ maxWidth: 760 }}>
          <h2 id="how-title" className="title-3" style={{ marginBottom: 18 }}>How it works</h2>
          <ol className="lab-about">
            {tool.about.map((line, i) => <li key={line}><b>{i + 1}</b><span>{line}</span></li>)}
          </ol>
          {post ? (
            <p style={{ marginTop: 24 }}>
              <Link href={`/blog/${post.slug}`} className="more-link">Read the post: {post.title} <span aria-hidden="true">›</span></Link>
            </p>
          ) : null}
        </div>
      </section>

      <section className="soft section-tight" aria-labelledby="more-title">
        <div className="wrap">
          <div className="section-head">
            <h2 id="more-title" className="title-3">More demos</h2>
            <Link href="/lab" className="more-link">All demos <span aria-hidden="true">›</span></Link>
          </div>
          <SpotlightGroup>
            <div className="grid grid-3">{others.map((t) => <DemoCard key={t.slug} tool={t} />)}</div>
          </SpotlightGroup>
        </div>
      </section>

      <JsonLd data={ld} />
    </main>
  );
}
