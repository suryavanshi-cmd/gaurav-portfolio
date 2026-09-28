import Link from 'next/link';
import { Counter, CopyEmail, Rotator, SpotlightGroup } from '../components/ui';
import { Icon, PostCard, ProjectCard } from '../components/cards';
import { LAB, LAB_LEARN, LAB_TOOLS } from '../components/lab/registry';
import TryIt from '../components/TryIt';
import { projects } from '../components/projects';
import { posts } from '../components/posts';
import { PERSON, TICKER } from '../components/site';

export const metadata = {
  alternates: { canonical: '/' },
};

const WORDS = ['Java 17', 'TestNG', 'Rest-Assured', 'Oracle SQL', 'Node.js', 'NestJS', 'Spring Boot', 'MongoDB', 'Python'];

const DOING = [
  {
    icon: 'test',
    title: 'Test automation',
    text: 'API test frameworks in Java 17, TestNG and Rest-Assured.',
    items: ['190+ case regression suite', 'Parallel runs in CI', 'Schema and database checks'],
    href: '/projects/claims-api-test-framework',
  },
  {
    icon: 'server',
    title: 'Backend',
    text: 'Services in Node.js, NestJS, Express and Spring Boot.',
    items: ['REST, SSE and JWT auth', 'Socket.io real-time', 'MongoDB and Oracle SQL'],
    href: '/projects/realtime-chat-backend',
  },
  {
    icon: 'spark',
    title: 'AI, made simple',
    text: 'Games that explain AI agents and how to test them.',
    items: ['LangGraph: wire an agent', 'Langfuse: trace detective', 'A prompt-injection game'],
    href: '/lab#learn',
  },
  {
    icon: 'layers',
    title: 'Useful tools',
    text: 'Full apps, and free tools anyone can use.',
    items: ['Bill splitter, EMI and SIP', 'Connect to Nature', 'Rakta-Setu'],
    href: '/lab#tools',
  },
];

export default function Home() {
  const featured = projects.filter((project) => project.featured);
  const latest = posts.slice(0, 3);

  return (
    <main id="main">
      <section className="hero" aria-labelledby="hero-title">
        <div className="wrap">
          <p className="eyebrow" data-rise>SDET · {PERSON.city}, {PERSON.country}</p>
          <h1 id="hero-title" className="display hero-title" data-rise style={{ '--rise': 1 }}>
            I test software for a living. <span className="hero-soft">I build it for fun.</span>
          </h1>
          <p className="lede" data-rise style={{ '--rise': 2 }}>
            I build API test automation for health-insurance claims at {PERSON.employer}. On my own I build
            backend services, full apps, free everyday tools, and small games that make tech easy to understand.
          </p>
          <p className="rotator" data-rise style={{ '--rise': 3 }}>
            Working with <Rotator words={WORDS} />
          </p>
          <div className="btn-row" data-rise style={{ '--rise': 4 }}>
            <Link href="/lab" className="btn btn-primary">Try the free tools</Link>
            <Link href="/projects" className="btn btn-ghost">See my projects</Link>
          </div>
          <p className="hero-hint" data-rise style={{ '--rise': 5 }}>
            <i aria-hidden="true" /> Move your cursor or tap — the dots in the background are real spring physics.
          </p>
        </div>
        <span className="scroll-cue" aria-hidden="true" />
      </section>

      <section className="solid section-tight" aria-label="In numbers">
        <div className="wrap">
          <div className="stats" data-rise>
            <div className="stat"><Counter to={190} suffix="+" /><span>API test cases in one regression suite</span></div>
            <div className="stat"><Counter to={2} suffix="+" /><span>years building test automation</span></div>
            <div className="stat"><Counter to={LAB.length} /><span>free tools and games on this site</span></div>
            <div className="stat"><Counter to={posts.length} /><span>short posts on testing and systems</span></div>
          </div>
        </div>
      </section>

      <section className="solid section" aria-labelledby="doing-title">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow" data-rise>What I do</p>
              <h2 id="doing-title" className="headline" data-rise style={{ '--rise': 1 }}>More than testing.</h2>
              <p className="lede" data-rise style={{ '--rise': 2 }}>
                Testing is my job. Backend work, AI tools and full apps are how I make sure I understand what I test.
              </p>
            </div>
          </div>
          <SpotlightGroup>
            <div className="grid grid-4 stagger" data-rise>
              {DOING.map((item) => (
                <Link key={item.title} href={item.href} className="card do-card">
                  <span className="do-icon"><Icon name={item.icon} /></span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <ul>{item.items.map((line) => <li key={line}>{line}</li>)}</ul>
                </Link>
              ))}
            </div>
          </SpotlightGroup>
        </div>
      </section>

      <div className="solid">
        <div className="ticker" aria-label="Tools from my résumé">
          <div className="ticker-move">
            <span className="ticker-run">{TICKER.map((item) => <span key={item}>{item}</span>)}</span>
            <span className="ticker-run" aria-hidden="true">{TICKER.map((item) => <span key={`${item}-2`}>{item}</span>)}</span>
          </div>
        </div>
      </div>

      <section className="soft section" aria-labelledby="live-title">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow" data-rise>Try it</p>
              <h2 id="live-title" className="headline" data-rise style={{ '--rise': 1 }}>Useful. And fun.</h2>
              <p className="lede" data-rise style={{ '--rise': 2 }}>
                Free tools for everyday life, and games that make tech simple. All in your browser — no sign-up.
              </p>
            </div>
            <Link href="/lab" className="more-link" data-rise>All {LAB.length} <span aria-hidden="true">›</span></Link>
          </div>
          <div data-rise>
            <TryIt tools={LAB_TOOLS.map(({ about, ...t }) => t)} games={LAB_LEARN.slice(0, 6).map(({ about, ...t }) => t)} />
          </div>
        </div>
      </section>

      <section className="solid section" aria-labelledby="work-title">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow" data-rise>Projects</p>
              <h2 id="work-title" className="headline" data-rise style={{ '--rise': 1 }}>Things I’ve built.</h2>
            </div>
            <Link href="/projects" className="more-link" data-rise>All projects <span aria-hidden="true">›</span></Link>
          </div>
          <SpotlightGroup>
            <div className="grid grid-2 stagger" data-rise>
              {featured.map((project) => <ProjectCard key={project.slug} project={project} />)}
            </div>
          </SpotlightGroup>
        </div>
      </section>

      <section className="soft section" aria-labelledby="writing-title">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow" data-rise>Writing</p>
              <h2 id="writing-title" className="headline" data-rise style={{ '--rise': 1 }}>Short. Plain. Useful.</h2>
            </div>
            <Link href="/writing" className="more-link" data-rise>All posts <span aria-hidden="true">›</span></Link>
          </div>
          <SpotlightGroup>
            <div className="grid grid-3 stagger" data-rise>
              {latest.map((post) => <PostCard key={post.slug} post={post} />)}
            </div>
          </SpotlightGroup>
        </div>
      </section>

      <section className="solid section contact-band" aria-labelledby="contact-title">
        <div className="wrap">
          <p className="eyebrow" data-rise>Contact</p>
          <h2 id="contact-title" className="display" data-rise style={{ '--rise': 1 }}>Let’s talk.</h2>
          <p className="lede" data-rise style={{ '--rise': 2 }}>
            I’m open to SDET, API test automation and LLM application engineering roles.
          </p>
          <div className="btn-row" data-rise style={{ '--rise': 3 }}>
            <CopyEmail email={PERSON.email} />
            <a href={PERSON.github} className="btn btn-ghost" target="_blank" rel="noreferrer noopener">GitHub ↗</a>
            <a href={PERSON.resume} className="btn btn-ghost" download>Résumé (PDF)</a>
          </div>
        </div>
      </section>
    </main>
  );
}
