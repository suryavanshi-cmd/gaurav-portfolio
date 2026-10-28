import Link from 'next/link';
import './css/personal.css';
import { PERSON } from '../components/site';

export const metadata = {
  title: 'Gaurav Suryavanshi — Curious mind. Creative builder.',
  description: 'A personal corner of the internet for Gaurav Suryavanshi. A curious software creator, film enthusiast, and lifelong learner based in Pune, India.',
  alternates: { canonical: '/' },
};

const interests = [
  {
    number: '01',
    symbol: '✳',
    label: 'THE DEFAULT SETTING',
    title: 'Always curious.',
    description: 'I ask too many questions, look things up for no particular reason, and enjoy going down rabbit holes just to see where they lead.',
    extra: 'The best ideas usually start with “what if?”',
  },
  {
    number: '02',
    symbol: '◉',
    label: 'AFTER THE LAPTOP CLOSES',
    title: 'A good film, always.',
    description: 'I love watching movies. A great story can stay in my head for days, and sometimes sends me searching for a new idea of my own.',
    extra: 'Stories have a way of changing perspectives.',
  },
  {
    number: '03',
    symbol: '↗',
    label: 'MY FAVOURITE EXPERIMENT',
    title: 'Making things.',
    description: 'I genuinely like creating software: little tools, bigger systems, odd experiments, and the occasional idea that starts with absolutely no plan.',
    extra: 'Some things work. All of them teach me something.',
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
            <div className="mp-kicker"><span className="mp-kicker-dot" /> A PERSONAL CORNER OF THE INTERNET <span className="mp-kicker-dash">—</span> PUNE, INDIA</div>
            <h1 id="mp-title">
              A little <em>curious.</em>
              <span>Always creating<span className="mp-title-dot">.</span></span>
            </h1>
            <p className="mp-hero-intro">
              Hey, I’m <strong>Gaurav.</strong> I write software, watch a lot of movies, think about how things work, and occasionally turn a random thought into something real.
            </p>
            <div className="mp-hero-actions">
              <a className="mp-action-primary" href="#about">Get to know me <span aria-hidden="true">↗</span></a>
              <a className="mp-action-text" href="#making">See what I’m making <span aria-hidden="true">↗</span></a>
            </div>
            <div className="mp-side-note"><span aria-hidden="true">↳</span> Not a résumé. Just a little more of me.</div>
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
            <div className="mp-sticker mp-sticker-top" aria-hidden="true">GOOD IDEAS<br />START SMALL ✳</div>
            <div className="mp-sticker mp-sticker-round" aria-hidden="true"><span>STILL<br />FIGURING<br />IT OUT</span><b>↗</b></div>
            <div className="mp-hand-note" aria-hidden="true">hi, that’s me! <span>⤴</span></div>
            <div className="mp-hero-art-caption">SOMEWHERE BETWEEN THE NEXT IDEA AND THE NEXT FILM.</div>
          </div>
        </section>

        <div className="mp-ticker" aria-label="Things that describe me">
          <span>CURIOUS MIND</span><i aria-hidden="true">✳</i>
          <span>MOVIE PERSON</span><i aria-hidden="true">✳</i>
          <span>SOFTWARE MAKER</span><i aria-hidden="true">✳</i>
          <span>LIFELONG LEARNER</span><i aria-hidden="true">✳</i>
          <span>VERY MUCH HUMAN</span>
        </div>

        <section id="about" className="mp-about mp-section" aria-labelledby="mp-about-title">
          <div className="mp-section-heading">
            <span className="mp-index">01 / A LITTLE ABOUT ME</span>
            <span className="mp-small-arrow" aria-hidden="true">↘</span>
          </div>
          <div className="mp-about-layout">
            <h2 id="mp-about-title">I like understanding things.<br /><em>Then making my own.</em></h2>
            <div className="mp-about-copy">
              <p>I’m a software engineer, but that’s just one part of the story. Before any job title, I’m someone who gets excited by a new question, an interesting film, or an idea scribbled down at the wrong time.</p>
              <p>My favourite way to learn is to build. I enjoy untangling complicated problems, experimenting with different approaches, and making things that feel surprisingly simple in the end.</p>
              <p>I've also spent time teaching engineering mathematics. Explaining a tricky idea until it finally clicks for someone else is a kind of magic I never get tired of.</p>
              <Link className="mp-inline-link" href="/about">The slightly more professional version <span aria-hidden="true">↗</span></Link>
            </div>
          </div>
          <div className="mp-scribble" aria-hidden="true">stay curious, always. <span>✳</span></div>
        </section>

        <section id="interests" className="mp-interests mp-section" aria-labelledby="mp-interests-title">
          <div className="mp-section-heading">
            <span className="mp-index">02 / THE LITTLE THINGS</span>
            <span className="mp-small-arrow" aria-hidden="true">↘</span>
          </div>
          <div className="mp-heading-flex">
            <h2 id="mp-interests-title">A few things that<br /><em>make me, me.</em></h2>
            <p>Because there’s a lot more to a person than the things they put on LinkedIn.</p>
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
            <div><span>01</span><p>One more question<br />before I sleep.</p></div>
            <div><span>02</span><p>A film I’ll keep<br />thinking about.</p></div>
            <div><span>03</span><p>Too many tabs,<br />one new idea.</p></div>
            <div><span>04</span><p>“What if I just<br />build it?”</p></div>
          </div>
        </section>

        <section id="making" className="mp-making mp-section" aria-labelledby="mp-making-title">
          <div className="mp-section-heading">
            <span className="mp-index">03 / SOME THINGS I'VE MADE</span>
            <span className="mp-small-arrow" aria-hidden="true">↘</span>
          </div>
          <div className="mp-heading-flex">
            <h2 id="mp-making-title">Ideas I followed<br /><em>all the way through.</em></h2>
            <p>No endless technology lists. Just a few things I was curious enough to make real.</p>
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
          <div className="mp-note-content"><span className="mp-note-mark" aria-hidden="true">“</span><h2 id="mp-note-title">Keep asking better questions.<br /><em>Keep making little things.</em><br />Keep enjoying the story.</h2><span className="mp-note-sign">— Gaurav, probably with 20 tabs open.</span></div>
        </section>

        <section className="mp-contact mp-section" aria-labelledby="mp-contact-title">
          <div className="mp-section-heading"><span className="mp-index">05 / KEEP IN TOUCH</span><span className="mp-small-arrow" aria-hidden="true">↘</span></div>
          <div className="mp-contact-inner">
            <div><p>HAVE AN IDEA, A QUESTION OR A FILM RECOMMENDATION?</p><h2 id="mp-contact-title">Come say <em>hello.</em></h2></div>
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

        <footer className="mp-footer"><span>© {new Date().getFullYear()} Gaurav Suryavanshi</span><span>Made with curiosity in Pune, India. <span aria-hidden="true">✳</span></span><a href="#main">Back to top ↑</a></footer>
      </div>
    </main>
  );
}
