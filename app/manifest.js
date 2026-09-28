import { PERSON, SITE } from '../components/site';

export default function manifest() {
  return {
    name: SITE.title,
    short_name: PERSON.name,
    description: SITE.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#fbfbfd',
    theme_color: '#fbfbfd',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
