import { ogCard, OG_SIZE } from '../../../components/og';
import { posts, postsBySlug } from '../../../components/posts';

export const alt = 'Article by Gaurav Suryavanshi';
export const size = OG_SIZE;
export const contentType = 'image/png';

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function Image({ params }) {
  const { slug } = await params;
  const post = postsBySlug[slug];
  return ogCard({
    eyebrow: 'Writing',
    title: post ? post.title : 'Writing',
    footer: post ? `${post.readingMinutes} min read` : '',
  });
}
