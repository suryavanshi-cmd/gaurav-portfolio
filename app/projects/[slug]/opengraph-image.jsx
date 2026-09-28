import { ogCard, OG_SIZE } from '../../../components/og';
import { projects, projectsBySlug } from '../../../components/projects';
import { KINDS } from '../../../components/format';

export const alt = 'Project by Gaurav Suryavanshi';
export const size = OG_SIZE;
export const contentType = 'image/png';

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export default async function Image({ params }) {
  const { slug } = await params;
  const project = projectsBySlug[slug];
  return ogCard({
    eyebrow: project ? (project.kind === 'design' ? 'Design · not shipped' : `Project · ${KINDS[project.kind].label}`) : 'Projects',
    title: project ? project.title : 'Projects',
    footer: project ? project.stack.slice(0, 3).join(' · ') : '',
  });
}
