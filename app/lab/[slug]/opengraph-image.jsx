import { ogCard, OG_SIZE } from '../../../components/og';
import { LAB, labBySlug } from '../../../components/lab/registry';

export const alt = 'Live demo by Gaurav Suryavanshi';
export const size = OG_SIZE;
export const contentType = 'image/png';

export function generateStaticParams() {
  return LAB.map((tool) => ({ slug: tool.slug }));
}

export default async function Image({ params }) {
  const { slug } = await params;
  const tool = labBySlug[slug];
  return ogCard({
    eyebrow: 'Live demo · runs in your browser',
    title: tool ? tool.title : 'Live demos',
    footer: tool ? tool.tags.join(' · ') : '',
  });
}
