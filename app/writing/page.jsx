import WritingBrowser from '../../components/WritingBrowser';
import JsonLd from '../../components/JsonLd';
import { posts } from '../../components/posts';
import { PERSON, SITE_URL } from '../../components/site';

export const metadata = {
  title: 'Writing',
  description:
    'Short, plain posts by Gaurav Suryavanshi on API test automation, flaky tests, database performance, scaling APIs, and testing LLM features.',
  alternates: { canonical: '/writing' },
  openGraph: { url: '/writing', title: 'Writing — Gaurav Suryavanshi' },
};

export default function WritingPage() {
  const blog = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Writing — Gaurav Suryavanshi',
    url: `${SITE_URL}/writing`,
    author: { '@type': 'Person', name: PERSON.name, url: SITE_URL },
    blogPost: posts.map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      url: `${SITE_URL}/blog/${post.slug}`,
      datePublished: post.date,
    })),
  };

  return (
    <main id="main">
      <section className="page-head">
        <div className="wrap">
          <p className="eyebrow" data-rise>Writing</p>
          <h1 className="display" data-rise style={{ '--rise': 1 }}>Short posts. Plain words.</h1>
          <p className="lede" data-rise style={{ '--rise': 2 }}>
            What I’ve learned about testing, APIs, databases and LLM features. Each post starts with the short version.
          </p>
        </div>
      </section>

      <section className="solid" style={{ paddingBottom: 'clamp(72px, 10vw, 128px)' }}>
        <div className="wrap">
          {/* Only the list fields cross to the client — not the post bodies. */}
          <WritingBrowser
            posts={posts.map(({ slug, title, summary, points, tags, date, readingMinutes }) => ({
              slug, title, summary, points, tags, date, readingMinutes,
            }))}
          />
        </div>
      </section>

      <JsonLd data={blog} />
    </main>
  );
}
