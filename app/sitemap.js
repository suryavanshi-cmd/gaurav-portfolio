import { posts } from '../components/posts.js';

/* The assistant's own page is new and is the thing worth landing on, so it
   needs to be discoverable rather than reachable only from the home page. */
export default function sitemap() {
  const base = 'https://gaurav-portfolio-topaz.vercel.app';
  return [
    { url: base, changeFrequency: 'monthly', priority: 1 },
    { url: `${base}/ask`, changeFrequency: 'monthly', priority: 0.9 },
    ...posts.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: post.date,
      changeFrequency: 'yearly',
      priority: 0.6,
    })),
  ];
}
