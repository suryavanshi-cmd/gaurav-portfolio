import Link from 'next/link';
import { notFound } from 'next/navigation';
import JsonLd from '../../../components/JsonLd';
import { KINDS, projects, projectsBySlug } from '../../../components/projects';
import { labBySlug } from '../../../components/lab/registry';
import { PERSON, SITE_URL } from '../../../components/site';

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const project = projectsBySlug[slug];
  if (!project) return {};
  const kind = KINDS[project.kind].label;
  return {
    title: project.title,
    description: project.note,
    keywords: [...project.stack, project.category, kind],
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      url: `/projects/${project.slug}`,
      title: `${project.title} — Gaurav Suryavanshi`,
      description: project.note,
      type: 'article',
    },
  };
}

export default async function ProjectPage({ params }) {
  const { slug } = await params;
  const project = projectsBySlug[slug];
  if (!project) notFound();

  const kind = KINDS[project.kind];
  const live = project.live ? labBySlug[project.live] : null;
  const index = projects.findIndex((p) => p.slug === slug);
  const prev = projects[index - 1];
  const next = projects[index + 1];

  /* Work lists what I did; a build or a design lists what made it hard. */
  const pointsLabel = project.kind === 'work' ? 'What I did' : 'What was hard';
  const outcomeLabel = project.kind === 'design' ? 'The goal' : 'The result';

  const ld = {
    '@context': 'https://schema.org',
    '@type': project.kind === 'design' ? 'CreativeWork' : 'SoftwareSourceCode',
    name: project.title,
    description: project.note,
    url: `${SITE_URL}/projects/${project.slug}`,
    author: { '@type': 'Person', name: PERSON.name, url: SITE_URL },
    keywords: project.stack.join(', '),
    ...(project.source ? { codeRepository: project.source } : {}),
  };

  return (
    <main id="main">
      <header className="page-head">
        <div className="wrap-prose">
          <Link href="/projects" className="crumb">‹ All projects</Link>
          <div className="detail-meta" data-rise>
            <span className={`badge ${kind.badge}`}>{kind.label}</span>
            {live ? <span className="badge badge-live"><span className="live-dot" aria-hidden="true" />Live demo</span> : null}
            <span className="muted" style={{ fontSize: 14 }}>{project.where || project.category}</span>
          </div>
          <h1 className="headline" data-rise style={{ '--rise': 1 }}>{project.title}</h1>
          <p className="lede" data-rise style={{ '--rise': 2 }}>{project.note}</p>

          {live || project.source ? (
            <div className="detail-links" data-rise style={{ '--rise': 3 }}>
              {live ? <Link href={`/lab/${live.slug}`} className="btn btn-primary">Try the live demo</Link> : null}
              {project.source ? (
                <a href={project.source} className="btn btn-ghost" target="_blank" rel="noreferrer noopener">View the code ↗</a>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      <article className="solid detail-body">
        <div className="wrap-prose">
          <section className="detail-block">
            <h2>The problem</h2>
            <p>{project.problem}</p>
          </section>

          <section className="detail-block">
            <h2>How it works</h2>
            <ol className="flow" data-rise>
              {project.flow.map((step, i) => (
                <li key={step}><b><small>{String(i + 1).padStart(2, '0')}</small>{step}</b></li>
              ))}
            </ol>
          </section>

          <section className="detail-block">
            <h2>{pointsLabel}</h2>
            <ul className="points">
              {project.challenges.map((point) => <li key={point}>{point}</li>)}
            </ul>
          </section>

          <section className="detail-block">
            <h2>{outcomeLabel}</h2>
            <p className="callout">{project.outcome}</p>
            {project.kind === 'design' ? (
              <p className="design-note">
                <span aria-hidden="true">✎</span>
                This is a design I worked out on paper — the problem, the approach and the trade-offs. It is not a shipped
                product.
              </p>
            ) : null}
          </section>

          <section className="detail-block">
            <h2>Built with</h2>
            <div className="tags">{project.stack.map((item) => <span key={item} className="tag">{item}</span>)}</div>
          </section>

          {project.next?.length ? (
            <section className="detail-block">
              <h2>Next</h2>
              <ul className="points">{project.next.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          ) : null}
        </div>

        <nav className="wrap-prose pager" aria-label="More projects">
          {prev ? (
            <Link href={`/projects/${prev.slug}`}>
              <small>‹ Previous</small>
              <strong>{prev.title}</strong>
            </Link>
          ) : null}
          {next ? (
            <Link href={`/projects/${next.slug}`} className="next">
              <small>Next ›</small>
              <strong>{next.title}</strong>
            </Link>
          ) : null}
        </nav>
      </article>

      <JsonLd data={ld} />
    </main>
  );
}
