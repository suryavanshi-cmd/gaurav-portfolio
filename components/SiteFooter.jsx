import Link from 'next/link';
import { PERSON } from './site';
import { LAB } from './lab/registry';

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <h4>{PERSON.name}</h4>
            <p style={{ maxWidth: 300, lineHeight: 1.55 }}>
              SDET in {PERSON.city}. I test APIs for a living and build backend services and LLM tools on the side.
            </p>
          </div>

          <div>
            <h4>Site</h4>
            <ul>
              <li><Link href="/">Home</Link></li>
              <li><Link href="/projects">Projects</Link></li>
              <li><Link href="/lab">Live demos</Link></li>
              <li><Link href="/writing">Writing</Link></li>
              <li><Link href="/about">About</Link></li>
            </ul>
          </div>

          <div>
            <h4>Try it live</h4>
            <ul>
              {LAB.slice(0, 5).map((tool) => (
                <li key={tool.slug}><Link href={`/lab/${tool.slug}`}>{tool.short}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4>Contact</h4>
            <ul>
              <li><a href={`mailto:${PERSON.email}`}>Email</a></li>
              <li><a href={PERSON.github} target="_blank" rel="noreferrer noopener">GitHub ↗</a></li>
              <li><a href={PERSON.resume} download>Résumé (PDF)</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-base">
          <span>© {year} {PERSON.name}</span>
          <span>Built with Next.js. Every demo runs in your browser.</span>
        </div>
      </div>
    </footer>
  );
}
