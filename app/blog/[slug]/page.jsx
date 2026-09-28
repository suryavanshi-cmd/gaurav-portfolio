import Link from 'next/link';
import { notFound } from 'next/navigation';
import BackToList from '../../../components/BackToList';
import JsonLd from '../../../components/JsonLd';
import { DemoCard, PostCard } from '../../../components/cards';
import { ReadingBar, SpotlightGroup } from '../../../components/ui';
import { CodeBlock, PostOutline } from '../../../components/PostTools';
import { LAB } from '../../../components/lab/registry';
import { posts, postsBySlug, formatDate } from '../../../components/posts';
import { PERSON, SITE_URL } from '../../../components/site';

/* Every post is known at build time, so each is prerendered as static HTML and
   an unknown slug 404s instead of rendering an empty shell. */
export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = postsBySlug[slug];
  if (!post) return {};

  return {
    title: post.title,
    description: post.summary,
    keywords: post.tags,
    authors: [{ name: PERSON.name, url: SITE_URL }],
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.summary,
      type: 'article',
      publishedTime: post.date,
      authors: [PERSON.name],
      url: `/blog/${post.slug}`,
      tags: post.tags,
    },
    twitter: { card: 'summary_large_image', title: post.title, description: post.summary },
  };
}

/* Stable ids for headings, so every section can be linked to. */
const toId = (text) => text.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function Block({ block }) {
  switch (block.type) {
    case 'h2': {
      const id = toId(block.text);
      return (
        <h2 className="post-h2" id={id}>
          {block.text}
          <a className="post-anchor" href={`#${id}`} aria-label={`Link to “${block.text}”`}>#</a>
        </h2>
      );
    }
    case 'p':
      return <p className="post-p">{block.text}</p>;
    case 'quote':
      return <blockquote className="post-quote">{block.text}</blockquote>;
    case 'ul':
      return <ul className="post-ul">{block.items.map((item) => <li key={item}>{item}</li>)}</ul>;
    case 'ol':
      return <ol className="post-ol">{block.items.map((item) => <li key={item}>{item}</li>)}</ol>;
    case 'code':
      return <CodeBlock code={block.code} lang={block.lang} />;
    case 'table':
      return (
        <div className="post-table-wrap">
          <table className="post-table">
            <thead><tr>{block.head.map((cell, i) => <th key={`${cell}-${i}`}>{cell}</th>)}</tr></thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.join('|')}>{row.map((cell, i) => <td key={`${cell}-${i}`}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}

/* Read next: posts sharing the most tags first, then the newest. */
function related(post) {
  return posts
    .filter((other) => other.slug !== post.slug)
    .map((other) => ({ other, shared: other.tags.filter((tag) => post.tags.includes(tag)).length }))
    .sort((a, b) => b.shared - a.shared || b.other.date.localeCompare(a.other.date))
    .slice(0, 2)
    .map(({ other }) => other);
}

export default async function PostPage({ params }) {
  const { slug } = await params;
  const post = postsBySlug[slug];
  if (!post) notFound();

  const demos = LAB.filter((tool) => tool.post === post.slug);
  const next = related(post);
  const sections = post.body.filter((b) => b.type === 'h2').map((b) => ({ id: toId(b.text), text: b.text }));

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.summary,
        datePublished: post.date,
        dateModified: post.date,
        keywords: post.tags.join(', '),
        url: `${SITE_URL}/blog/${post.slug}`,
        mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
        image: `${SITE_URL}/blog/${post.slug}/opengraph-image`,
        author: { '@type': 'Person', name: PERSON.name, url: SITE_URL },
        publisher: { '@type': 'Person', name: PERSON.name, url: SITE_URL },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Writing', item: `${SITE_URL}/writing` },
          { '@type': 'ListItem', position: 3, name: post.title, item: `${SITE_URL}/blog/${post.slug}` },
        ],
      },
    ],
  };

  return (
    <main id="main">
      <ReadingBar targetId="post" />
      {sections.length > 2 ? <PostOutline sections={sections} /> : null}

      <article id="post" className="article">
        <div className="wrap-prose">
          <header className="page-head" style={{ paddingBottom: 0 }}>
            <BackToList href="/writing" className="crumb">‹ All posts</BackToList>
            <div className="post-meta" data-rise style={{ borderBottom: 0, paddingBottom: 0, marginTop: 0, marginBottom: 18 }}>
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              <span aria-hidden="true">·</span>
              <span>{post.readingMinutes} min read</span>
            </div>
            <h1 className="post-title" data-rise style={{ '--rise': 1 }}>{post.title}</h1>
            <p className="post-summary" data-rise style={{ '--rise': 2 }}>{post.summary}</p>
            <div className="tags" style={{ marginTop: 20 }} data-rise>
              {post.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
            </div>
          </header>

          {post.points?.length ? (
            <aside className="in-short" aria-labelledby="in-short-title" data-rise>
              <h2 id="in-short-title">In short</h2>
              <ul>{post.points.map((point) => <li key={point}>{point}</li>)}</ul>
            </aside>
          ) : null}

          <div className="post-body">
            {post.body.map((block, index) => <Block key={`${block.type}-${index}`} block={block} />)}
          </div>
        </div>
      </article>

      {demos.length ? (
        <section className="soft section-tight" aria-labelledby="try-title">
          <div className="wrap-prose">
            <p className="eyebrow">Try it live</p>
            <h2 id="try-title" className="title-3" style={{ marginBottom: 20 }}>See this idea working, in your browser.</h2>
            <SpotlightGroup>
              <div className={demos.length > 1 ? 'grid grid-2' : undefined}>
                {demos.map((tool) => <DemoCard key={tool.slug} tool={tool} />)}
              </div>
            </SpotlightGroup>
          </div>
        </section>
      ) : null}

      <section className="solid section-tight" aria-labelledby="next-title">
        <div className="wrap">
          <div className="section-head">
            <h2 id="next-title" className="title-3">Read next</h2>
            <Link href="/writing" className="more-link">All posts <span aria-hidden="true">›</span></Link>
          </div>
          <SpotlightGroup>
            <div className="grid grid-2">{next.map((other) => <PostCard key={other.slug} post={other} />)}</div>
          </SpotlightGroup>
        </div>
      </section>

      <JsonLd data={ld} />
    </main>
  );
}
