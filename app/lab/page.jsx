import JsonLd from '../../components/JsonLd';
import { DemoCard } from '../../components/cards';
import { SpotlightGroup } from '../../components/ui';
import { LAB } from '../../components/lab/registry';
import { SITE_URL } from '../../components/site';

export const metadata = {
  title: 'Live demos',
  description:
    'Working tools you can use in the browser: a token-bucket rate limiter, a cache stampede simulator, a capacity planner, a JSONPath API chain builder, a prompt-injection game, notes on LLMs and a search assistant.',
  alternates: { canonical: '/lab' },
  openGraph: { url: '/lab', title: 'Live demos — Gaurav Suryavanshi' },
};

export default function LabPage() {
  const list = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Live demos by Gaurav Suryavanshi',
    itemListElement: LAB.map((tool, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/lab/${tool.slug}`,
      name: tool.title,
    })),
  };

  return (
    <main id="main">
      <section className="page-head">
        <div className="wrap">
          <p className="eyebrow" data-rise>Live demos</p>
          <h1 className="display" data-rise style={{ '--rise': 1 }}>Try it, don’t take my word for it.</h1>
          <p className="lede" data-rise style={{ '--rise': 2 }}>
            Small working tools for ideas I write about. Everything runs in your browser — no sign-up, no server, no
            tracking.
          </p>
        </div>
      </section>

      <section className="solid" style={{ paddingBottom: 'clamp(72px, 10vw, 128px)' }}>
        <div className="wrap">
          <SpotlightGroup>
            <div className="grid grid-3 stagger" data-rise>
              {LAB.map((tool) => <DemoCard key={tool.slug} tool={tool} />)}
            </div>
          </SpotlightGroup>
        </div>
      </section>

      <JsonLd data={list} />
    </main>
  );
}
