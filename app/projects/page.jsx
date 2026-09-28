import ProjectsBrowser from '../../components/ProjectsBrowser';
import JsonLd from '../../components/JsonLd';
import { projects } from '../../components/projects';
import { SITE_URL } from '../../components/site';

export const metadata = {
  title: 'Projects',
  description:
    'Projects by Gaurav Suryavanshi: API test frameworks built at work, apps built on his own — a farm-stay marketplace and a WhatsApp blood-report service — and system designs for LLM tools.',
  alternates: { canonical: '/projects' },
  openGraph: { url: '/projects', title: 'Projects — Gaurav Suryavanshi' },
};

export default function ProjectsPage() {
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Projects by Gaurav Suryavanshi',
    itemListElement: projects.map((project, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE_URL}/projects/${project.slug}`,
      name: project.title,
    })),
  };

  return (
    <main id="main">
      <section className="page-head">
        <div className="wrap">
          <p className="eyebrow" data-rise>Projects</p>
          <h1 className="display" data-rise style={{ '--rise': 1 }}>Built, shipped, and thought through.</h1>
          <p className="lede" data-rise style={{ '--rise': 2 }}>
            Work from my jobs, things I built on my own, and systems I have designed on paper. Each is labelled, so you
            always know which is which.
          </p>
        </div>
      </section>

      <section className="solid" style={{ paddingBottom: 'clamp(72px, 10vw, 128px)' }}>
        <div className="wrap">
          {/* Only the card fields cross to the client. */}
          <ProjectsBrowser
            projects={projects.map(({ slug, kind, title, note, stack, category, live }) => ({
              slug, kind, title, note, stack, category, live: live || null,
            }))}
          />
        </div>
      </section>

      <JsonLd data={itemList} />
    </main>
  );
}
