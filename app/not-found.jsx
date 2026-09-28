import Link from 'next/link';

export const metadata = {
  title: 'Page not found',
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main id="main" className="wrap lost">
      <p className="eyebrow">Error 404</p>
      <h1 className="display">404</h1>
      <p className="lede" style={{ marginInline: 'auto' }}>This page doesn’t exist. It may have moved.</p>
      <div className="btn-row">
        <Link href="/" className="btn btn-primary">Go home</Link>
        <Link href="/writing" className="btn btn-ghost">Read the posts</Link>
      </div>
    </main>
  );
}
