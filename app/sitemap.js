import { SITE_URL } from '../components/site';
import { projects } from '../components/projects';
import { posts } from '../components/posts';
import { LAB } from '../components/lab/registry';

/* Every public page, generated from the same lists the pages are built from,
   so a new project, post or demo is in the sitemap the moment it exists. */
export default function sitemap() {
  const latest = posts[0]?.date ? new Date(posts[0].date) : new Date();
  const page = (path, priority, changeFrequency = 'monthly', lastModified = latest) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  });

  return [
    page('/', 1, 'weekly'),
    page('/projects', 0.9, 'weekly'),
    page('/lab', 0.9, 'weekly'),
    page('/writing', 0.8, 'weekly'),
    page('/about', 0.7),
    ...LAB.map((tool) => page(`/lab/${tool.slug}`, 0.8)),
    ...projects.map((p) => page(`/projects/${p.slug}`, p.kind === 'design' ? 0.5 : 0.7)),
    ...posts.map((post) => page(`/blog/${post.slug}`, 0.7, 'yearly', new Date(post.date))),
  ];
}
