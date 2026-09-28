'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatDate } from './format';
import { Segmented } from './ui';

/* Filters as you type: every word must appear somewhere in the title, the
   summary, the "in short" points or the tags. */
function matches(post, query) {
  if (!query) return true;
  const haystack = [post.title, post.summary, ...(post.points || []), ...post.tags].join(' ').toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
}

const TOPICS = [
  { value: 'all', label: 'All' },
  { value: 'testing', label: 'Testing', test: (p) => p.tags.some((t) => /test|ci/i.test(t)) },
  { value: 'systems', label: 'Systems', test: (p) => p.tags.some((t) => /system|database|scal|sql|api|perf/i.test(t)) },
  { value: 'llm', label: 'AI', test: (p) => p.tags.some((t) => /llm|rag|guardrail|evaluation|search|agent|langgraph|langfuse/i.test(t)) },
];

export default function WritingBrowser({ posts }) {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('all');

  const visible = useMemo(() => {
    const byTopic = TOPICS.find((t) => t.value === topic);
    return posts.filter((post) => (topic === 'all' || byTopic.test(post)) && matches(post, query));
  }, [posts, query, topic]);

  const options = TOPICS.map((t) => ({
    value: t.value,
    label: t.label,
    count: t.value === 'all' ? posts.length : posts.filter(t.test).length,
  }));

  return (
    <>
      <div className="browse-bar">
        <Segmented label="Filter by topic" options={options} value={topic} onChange={setTopic} />
        <label className="search">
          <span className="sr-only">Search posts</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            placeholder="Search posts"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <p className="browse-count" aria-live="polite" style={{ marginBottom: 12 }}>
        {visible.length} {visible.length === 1 ? 'post' : 'posts'}
      </p>

      {visible.length ? (
        <ul className="post-list" key={topic}>
          {visible.map((post, i) => (
            <li key={post.slug} style={{ animation: `card-in 520ms var(--expo) ${i * 40}ms both` }}>
              <Link
                href={`/blog/${post.slug}`}
                className="post-row"
                onClick={() => {
                  /* Lets the article's back link return here, at this scroll
                     position, instead of pushing a fresh copy of the list. */
                  try { window.sessionStorage.setItem('return-to-list', '1'); } catch { /* storage blocked */ }
                }}
              >
                <time dateTime={post.date}>{formatDate(post.date)}</time>
                <div>
                  <h3>{post.title}</h3>
                  <p>{post.summary}</p>
                  <div className="tags">{post.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}</div>
                </div>
                <span className="read">{post.readingMinutes} min</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">Nothing matches “{query}”. Try a shorter word.</p>
      )}
    </>
  );
}
