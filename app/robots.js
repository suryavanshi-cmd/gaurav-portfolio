export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: 'https://gaurav-portfolio-topaz.vercel.app/sitemap.xml',
  };
}
