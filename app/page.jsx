import Link from 'next/link';
import './css/personal.css';
import { PERSON } from '../components/site';

export const metadata = {
  title: 'Gaurav Suryavanshi — A student everywhere. Always learning.',
  description: 'A student everywhere, an engineer by mindset, a curious maker and teacher who loves learning, sharing, mathematics, films and a little sarcasm.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Gaurav Suryavanshi — A student everywhere. Always learning.',
    description: 'Always learning and sharing: engineering, mathematics, films, everyday curiosity, and a little sarcasm.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gaurav Suryavanshi — A student everywhere. Always learning.',
    description: 'An engineer by mindset. A student everywhere. Learning and sharing with a little sarcasm.',
  },
};

const interests = [
  {
    number: '01',
    symbol: '✳',
    label: 'THE DEFAULT SETTING',
    title: 'A student everywhere.',
    description: 'I learn from almost anything: engineering, mathematics, people, films and the world around me. One question tends to become ten. Very efficient, obviously.',
    extra: 'Currently enrolled in the university of asking too many questions.',
  },
  {
    number: '02',
    symbol: '◉',
    label: 'AFTER THE LAPTOP CLOSES',
    title: 'Stories, please.',
    description: 'Films are my other classroom. Great stories stay with me, change how I see things and occasionally inspire something I want to make.',
    extra: '“Just one more film” — historically, a very reliable plan.',
  },
  {
    number: '03',
    symbol: '↗',
    label: 'MY FAVOURITE EXPERIMENT',
    title: 'Make it. Share it.',
    description: 'I think like an engineer beyond software: learn how something works, experiment, make a useful thing and explain it so somebody else can learn too.',
    extra: 'If it fails, I call it research. Surprisingly effective.',
  },
];

const projects = [
  {
    number: '01 / A DATABASE, FROM ZERO',
    title: 'QueryLite',
    description: 'I wanted to understand what happens between writing a SQL query and getting an answer. So I built a tiny database engine.',
    href: '/projects/querylite',
    icon: 'select * from ideas;',
    tag: 'A PERSONAL EXPERIMENT',
    type: 'database',
  },
  {
    number: '02 / A DISTRIBUTED EXPERIMENT',
    title: 'Raft, made visual',
    description: 'A hands-on way to explore how machines agree, disagree, fail, and still find their way back.',
    href: '/projects/raft-consensus',
    icon: '● — ● — ●',
    tag: 'LEARNING BY BUILDING',
    type: 'raft',
  },
  {
    number: '03 / A REAL-TIME IDEA',
    title: 'A shared canvas',
    description: 'Two people, one space, and edits that stay in sync. A small window into collaborative systems.',
    href: '/projects/crdt-editor',
    icon: 'A + B → ∞',
    tag: 'AN INTERACTIVE BUILD',
    type: 'crdt',
  },
];

export default function Home() {
  return (
    <main id="main" className="mp-home">
      <div className="mp-page">
        <header className="mp-header">
          <Link className="mp-logo" href="/" aria-label="Gaurav Suryavanshi — homepage">
            <span className="mp-logo-circle">g.</span>
            <span>gaurav<span className="mp-logo-period">.</span></span>
          </Link>
          <nav className="mp-navigation" aria-label="Homepage navigation">
            <a href="#about">About me</a>
            <a href="#interests">Little things</a>
            <a href="#making">Things I make</a>
            <Link href="/lab">Playground</Link>
          </nav>
          <a className="mp-header-contact" href={'mailto:' + PERSON.email}>Say hello <span aria-hidden="true">↗</span></a>
        </header>

        <section className="mp-hero" aria-labelledby="mp-title">
          <div className="mp-hero-copy">
            <div className="mp-kicker"><span className="mp-kicker-dot" /> A STUDENT OF EVERYTHING, EVERYWHERE <span className="mp-kicker-dash">—</span> PUNE, INDIA</div>
            <h1 id="mp-title">
              A student <em>everywhere.</em>
              <span>Always learning<span className="mp-title-dot">.</span></span>
            </h1>
            <p className="mp-hero-intro">
              Hey, I’m <strong>Gaurav.</strong> An engineer by mindset and a student everywhere I go. I love learning, sharing what I discover, building things, teaching mathematics and watching films. Sometimes I even close a browser tab.
            </p>
            <div className="mp-hero-actions">
              <a className="mp-action-primary" href="#about">Get to know me <span aria-hidden="true">↗</span></a>
              <a className="mp-action-text" href="#making">See what I’m making <span aria-hidden="true">↗</span></a>
            </div>
            <div className="mp-side-note"><span aria-hidden="true">↳</span> Not a résumé. Notes from a lifelong student.</div>
          </div>

          <div className="mp-hero-art" aria-label="Portrait and personal stickers">
            <div className="mp-sketch-circle" aria-hidden="true" />
            <div className="mp-photo-outer">
              <div className="mp-photo-inner">
                <span className="mp-photo-initials" aria-hidden="true">GS</span>
                <img
                  src="https://avatars.githubusercontent.com/u/304623412?v=4"
                  alt="Gaurav Suryavanshi's GitHub profile image"
                  width="540"
                  height="540"
                  loading="eager"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <div className="mp-sticker mp-sticker-top" aria-hidden="true">LEARN<br />THEN SHARE ✳</div>
            <div className="mp-sticker mp-sticker-round" aria-hidden="true"><span>STUDENT<br />OF<br />EVERYTHING</span><b>↗</b></div>
            <div className="mp-hand-note" aria-hidden="true">hi, that’s me! <span>⤴</span></div>
            <div className="mp-hero-art-caption">LEARNING EVERYWHERE. FIGURING IT OUT AS I GO.</div>
          </div>
        </section>

        <div className="mp-ticker" aria-label="Things that describe me">
          <span>STUDENT EVERYWHERE</span><i aria-hidden="true">✳</i>
          <span>FILMS & STORIES</span><i aria-hidden="true">✳</i>
          <span>ENGINEER BY MINDSET</span><i aria-hidden="true">✳</i>
          <span>LEARN & SHARE</span><i aria-hidden="true">✳</i>
          <span>SARCASM INCLUDED</span>
        </div>

        <section id="about" className="mp-about mp-section" aria-labelledby="mp-about-title">
          <div className="mp-section-heading">
            <span className="mp-index">01 / A LITTLE ABOUT ME</span>
            <span className="mp-small-arrow" aria-hidden="true">↘</span>
          </div>
          <div className="mp-about-layout">
            <h2 id="mp-about-title">Always a student.<br /><em>Of more than one subject.</em></h2>
            <div className="mp-about-copy">
              <p>Software engineering is what I do professionally; being a student everywhere is who I am. I learn from mathematics, technology, films, conversations and ordinary things most people walk past.</p>
              <p>I like asking questions, making things, getting them wrong, fixing them and sharing what finally makes sense. The engineer in me likes solutions; the student in me keeps asking why.</p>
              <p>I teach engineering mathematics too. The best part is when a difficult idea clicks for someone else. The bonus is discovering how much the teacher still has to learn.</p>
              <Link className="mp-inline-link" href="/about">The slightly more professional version <span aria-hidden="true">↗</span></Link>
            </div>
          </div>
          <div className="mp-scribble" aria-hidden="true">forever a student, apparently. <span>✳</span></div>
        </section>

        <section id="interests" className="mp-interests mp-section" aria-labelledby="mp-interests-title">
          <div className="mp-section-heading">
            <span className="mp-index">02 / THE LITTLE THINGS</span>
            <span className="mp-small-arrow" aria-hidden="true">↘</span>
          </div>
          <div className="mp-heading-flex">
            <h2 id="mp-interests-title">Things I learn from.<br /><em>Things I enjoy.</em></h2>
            <p>Curiosity doesn’t respect job descriptions. Thankfully.</p>
          </div>
          <div className="mp-interest-grid">
            {interests.map((item) => (
              <article className="mp-interest" key={item.number}>
                <div className="mp-interest-top"><span>{item.number} / 03</span><span className="mp-interest-symbol" aria-hidden="true">{item.symbol}</span></div>
                <div className="mp-interest-content">
                  <p className="mp-micro-label">{item.label}</p>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
                <p className="mp-interest-foot">{item.extra}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mp-moments" aria-label="Little moments of an ordinary day">
          <div className="mp-moments-title"><span className="mp-index">A FEW FAMILIAR SCENES</span><span>✳</span></div>
          <div className="mp-moments-grid">
            <div><span>01</span><p>A new question.<br />At midnight, naturally.</p></div>
            <div><span>02</span><p>Movie credits roll.<br />Learning continues.</p></div>
            <div><span>03</span><p>Twenty open tabs.<br />Apparently, research.</p></div>
            <div><span>04</span><p>Learn it. Build it.<br />Explain it. Repeat.</p></div>
          </div>
        </section>

        <section id="making" className="mp-making mp-section" aria-labelledby="mp-making-title">
          <div className="mp-section-heading">
            <span className="mp-index">03 / SOME THINGS I'VE MADE</span>
            <span className="mp-small-arrow" aria-hidden="true">↘</span>
          </div>
          <div className="mp-heading-flex">
            <h2 id="mp-making-title">Ideas I followed<br /><em>all the way through.</em></h2>
            <p>Not everything I learn becomes software. Here are a few questions that did—and what I built while trying to answer them.</p>
          </div>
          <div className="mp-work-grid">
            {projects.map((project) => (
              <Link href={project.href} key={project.href} className={'mp-work mp-work-' + project.type}>
                <div className="mp-work-top"><span>{project.number}</span><span aria-hidden="true">↗</span></div>
                <div className="mp-work-art" aria-hidden="true"><span>{project.icon}</span></div>
                <div className="mp-work-bottom">
                  <p className="mp-micro-label">{project.tag}</p>
                  <h3>{project.title}</h3>
                  <p>{project.description}</p>
                  <span className="mp-work-link">Explore this project ↗</span>
                </div>
              </Link>
            ))}
          </div>
          <div className="mp-more-projects"><Link href="/projects">See everything I’ve built <span aria-hidden="true">↗</span></Link><Link href="/lab">Or try something in the playground <span aria-hidden="true">↗</span></Link></div>
        </section>

        <section className="mp-note mp-section" aria-labelledby="mp-note-title">
          <span className="mp-index">04 / A NOTE TO SELF</span>
          <div className="mp-note-content"><span className="mp-note-mark" aria-hidden="true">“</span><h2 id="mp-note-title">Be a student everywhere.<br /><em>Learn something. Share something.</em><br />Don’t take yourself too seriously.</h2><span className="mp-note-sign">— Gaurav, who absolutely needed that twenty-first tab.</span></div>
        </section>

        <section className="mp-contact mp-section" aria-labelledby="mp-contact-title">
          <div className="mp-section-heading"><span className="mp-index">05 / KEEP IN TOUCH</span><span className="mp-small-arrow" aria-hidden="true">↘</span></div>
          <div className="mp-contact-inner">
            <div><p>HAVE SOMETHING TO TEACH ME, A QUESTION, OR A FILM RECOMMENDATION?</p><h2 id="mp-contact-title">Come say <em>hello.</em></h2></div>
            <a className="mp-contact-button" href={'mailto:' + PERSON.email} aria-label="Email Gaurav">↗</a>
          </div>
          <div className="mp-contact-links">
            <a href={'mailto:' + PERSON.email}>Email ↗</a>
            <a href={PERSON.github} target="_blank" rel="noreferrer noopener">GitHub ↗</a>
            <Link href="/writing">Writing ↗</Link>
            <Link href="/ask">Ask me something ↗</Link>
            <a href={PERSON.resume} download>Résumé, if you need it ↗</a>
          </div>
        </section>

        <footer className="mp-footer"><span>© {new Date().getFullYear()} Gaurav Suryavanshi</span><span>A student everywhere. Made with curiosity in Pune, India. <span aria-hidden="true">✳</span></span><a href="#main">Back to top ↑</a></footer>
      </div>
    </main>
  );
}
