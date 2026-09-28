import JsonLd from '../../components/JsonLd';
import { DemoCard } from '../../components/cards';
import { SpotlightGroup } from '../../components/ui';
import { LAB, LAB_LEARN, LAB_TOOLS } from '../../components/lab/registry';
import { SITE_URL } from '../../components/site';

export const metadata = {
  title: 'Tools and games',
  description:
    'Free tools that run in your browser — bill splitter, loan EMI calculator, SIP planner, focus timer, password maker — and games that teach LangGraph, Langfuse, LLM testing and system design by playing.',
  alternates: { canonical: '/lab' },
  openGraph: { url: '/lab', title: 'Tools and games — Gaurav Suryavanshi' },
};

export default function LabPage() {
  const list = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Tools and games by Gaurav Suryavanshi',
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
          <p className="eyebrow" data-rise>Tools and games</p>
          <h1 className="display" data-rise style={{ '--rise': 1 }}>Useful things. Fun ways to learn.</h1>
          <p className="lede" data-rise style={{ '--rise': 2 }}>
            Everyday tools anyone can use, and small games that explain tech by letting you play. All free, all in
            your browser — no sign-up, nothing uploaded.
          </p>
          <nav className="jump" aria-label="On this page" data-rise style={{ '--rise': 3 }}>
            <a href="#tools">Everyday tools <b>{LAB_TOOLS.length}</b></a>
            <a href="#learn">Learn by playing <b>{LAB_LEARN.length}</b></a>
          </nav>
        </div>
      </section>

      <section id="tools" className="solid lab-group" aria-labelledby="tools-title">
        <div className="wrap">
          <div className="group-title" data-rise><h2 id="tools-title">Everyday tools</h2><p>For money, time and passwords.</p></div>
          <SpotlightGroup>
            <div className="grid grid-3 stagger" data-rise>
              {LAB_TOOLS.map((tool) => <DemoCard key={tool.slug} tool={tool} />)}
            </div>
          </SpotlightGroup>
        </div>
      </section>

      <section id="learn" className="solid lab-group" style={{ paddingBottom: 'clamp(72px, 10vw, 128px)' }} aria-labelledby="learn-title">
        <div className="wrap">
          <div className="group-title" data-rise><h2 id="learn-title">Learn by playing</h2><p>AI agents, LLM testing and system design.</p></div>
          <SpotlightGroup>
            <div className="grid grid-3 stagger" data-rise>
              {LAB_LEARN.map((tool) => <DemoCard key={tool.slug} tool={tool} />)}
            </div>
          </SpotlightGroup>
        </div>
      </section>

      <JsonLd data={list} />
    </main>
  );
}
