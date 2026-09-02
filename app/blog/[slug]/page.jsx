import Link from 'next/link';
import BackToList from '../../../components/BackToList';
import ThemeToggle from '../../../components/ThemeToggle';
import { notFound } from 'next/navigation';
import '../../site.css';
import { posts, postsBySlug, formatDate } from '../../../components/posts';

/* Every post is known at build time, so each one is prerendered as static HTML
   and an unknown slug 404s instead of rendering an empty shell. */
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
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.summary,
      type: 'article',
      publishedTime: post.date,
      url: `/blog/${post.slug}`,
      tags: post.tags,
    },
  };
}

function Block({ block }) {
  switch (block.type) {
    case 'h2':
      return <h2 className="post-h2">{block.text}</h2>;
    case 'p':
      return <p className="post-p">{block.text}</p>;
    case 'quote':
      return <blockquote className="post-quote">{block.text}</blockquote>;
    case 'ul':
      return (
        <ul className="post-ul">
          {block.items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      );
    case 'ol':
      return (
        <ol className="post-ol">
          {block.items.map((item) => <li key={item}>{item}</li>)}
        </ol>
      );
    case 'code':
      return (
        <div className="post-code">
          {block.lang ? <span className="post-code-lang">{block.lang}</span> : null}
          <pre><code>{block.code}</code></pre>
        </div>
      );
    case 'table':
      return (
        <div className="post-table-wrap">
          <table className="post-table">
            <thead>
              <tr>{block.head.map((cell) => <th key={cell}>{cell}</th>)}</tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.join('|')}>
                  {row.map((cell, index) => <td key={`${cell}-${index}`}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}

export default async function PostPage({ params }) {
  const { slug } = await params;
  const post = postsBySlug[slug];
  if (!post) notFound();

  const others = posts.filter((entry) => entry.slug !== post.slug).slice(0, 2);

  return (
    <div className="shell">
      <div className="grain" aria-hidden="true" />

      <header className="head">
        <span className="head-name">Gaurav Suryavanshi</span>
        <nav className="head-nav" aria-label="Sections">
          <Link href="/#interests">writing</Link>
          <Link href="/#projects">projects</Link>
          <Link href="/">home</Link>
        </nav>
        <ThemeToggle />
      </header>

      <article className="post">
        <BackToList href="/#interests">← Interests &amp; writing</BackToList>

        <h1 className="post-title">{post.title}</h1>
        <p className="post-summary">{post.summary}</p>

        <div className="post-meta">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span aria-hidden="true">·</span>
          <span>{post.readingMinutes} min read</span>
          <ul className="post-tags">
            {post.tags.map((tag) => <li key={tag}>{tag}</li>)}
          </ul>
        </div>

        <div className="post-body">
          {post.body.map((block, index) => (
            <Block key={`${block.type}-${index}`} block={block} />
          ))}
        </div>
      </article>

      {others.length ? (
        <section className="section">
          <h2 className="section-label">Read next</h2>
          <ul className="list">
            {others.map((entry) => (
              <li key={entry.slug}>
                <Link className="row row-open" href={`/blog/${entry.slug}`}>
                  <span className="row-key">{entry.readingMinutes} min</span>
                  <span>
                    <span className="row-title">{entry.title}</span>
                    <span className="row-note">{entry.summary}</span>
                  </span>
                  <span className="row-go" aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="foot">Gaurav Suryavanshi — SDET · API automation · Pune</footer>
    </div>
  );
}
