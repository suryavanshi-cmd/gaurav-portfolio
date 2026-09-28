import { ogCard, OG_SIZE } from '../components/og';

export const alt = 'Gaurav Suryavanshi — I test software for a living. I build it for fun.';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return ogCard({
    eyebrow: 'Portfolio',
    title: 'I test software for a living. I build it for fun.',
    footer: 'Projects · Live demos · Writing',
  });
}
