import { versions, latestVersionKey } from '../../versions';

export const metadata = {
  title: 'Versions',
  description:
    'Every version of Gaurav Suryavanshi’s portfolio, kept online and browsable — from the original terminal-styled build to the current editorial one.',
};

export default function VersionsPage() {
  return (
    <main>
      <div className="ambient-background" aria-hidden="true" />

      <header className="site-header">
        <div className="container nav-row versions-nav">
          <a href="/" className="brand" aria-label="Gaurav Suryavanshi home">
            <span>GS</span>
            <div><strong>Gaurav Suryavanshi</strong><small>SDET · API Automation</small></div>
          </a>
          <a className="ghost-button" href="/">← Back to the portfolio</a>
        </div>
      </header>

      <section className="about-section" id="top">
        <div className="container">
          <p className="eyebrow">Archive</p>
          <h1 className="versions-title">
            Every version of this site, <span>still online.</span>
          </h1>
          <p className="versions-intro">
            Rebuilding a portfolio usually means deleting the last one. I kept them instead — each
            version is frozen at the design it shipped with, running on its own stylesheet, at its
            own address.
          </p>

          <ol className="versions-list">
            {versions.map((version) => (
              <li key={version.key}>
                <a className="version-entry" href={version.href}>
                  <div className="version-entry-head">
                    <span className="version-entry-label">{version.label}</span>
                    <div>
                      <h2>
                        {version.name}
                        {version.key === latestVersionKey ? <em>Current</em> : null}
                      </h2>
                      <p className="version-entry-tagline">{version.tagline}</p>
                    </div>
                    <span className="version-entry-year">{version.year}</span>
                  </div>
                  <p className="version-entry-body">{version.description}</p>
                  <span className="version-entry-go">Open {version.label} →</span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
