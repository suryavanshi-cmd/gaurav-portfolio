import Link from 'next/link';
import { CopyEmail, PuneClock, SpotlightGroup } from '../../components/ui';
import { CERTIFICATES, PERSON, SKILLS, TIMELINE } from '../../components/site';

export const metadata = {
  title: 'About',
  description:
    'An engineer by mindset and a student everywhere. Gaurav is curious about mathematics, films, people and technology. He enjoys learning, sharing, teaching and making things; his professional experience is here too.',
  alternates: { canonical: '/about' },
  openGraph: { url: '/about', title: 'About — Gaurav Suryavanshi', type: 'profile' },
};

export default function AboutPage() {
  return (
    <main id="main">
      <section className="page-head">
        <div className="wrap about-top">
          <div>
            <p className="eyebrow" data-rise>About / A student everywhere</p>
            <h1 className="display" data-rise style={{ '--rise': 1 }}>Hi, I’m Gaurav. Still learning.</h1>
            <p className="lede" data-rise style={{ '--rise': 2 }}>
              I'm an engineer by mindset and a student everywhere I go—learning from mathematics, technology, films, people, and whatever catches my curiosity. I like sharing what I learn, occasionally with sarcasm. Apparently curiosity doesn’t have an off switch.
            </p>
            <p className="lede" data-rise style={{ '--rise': 3 }}>
              Professionally, I build and test software in {PERSON.city}. Beyond that I teach engineering mathematics, watch films, try new ideas and build experiments. My work is one chapter, not the whole story.
            </p>
            <div className="btn-row" data-rise style={{ '--rise': 4 }}>
              <a href={PERSON.resume} className="btn btn-primary" download>Download résumé</a>
              <CopyEmail email={PERSON.email} className="btn btn-ghost">Copy email</CopyEmail>
            </div>
          </div>
          <aside className="about-side" data-rise style={{ '--rise': 2 }}>
            <div className="monogram" aria-hidden="true">GS</div>
            <PuneClock />
          </aside>
        </div>
      </section>

      <section className="solid section" aria-labelledby="path-title">
        <div className="wrap-prose">
          <p className="eyebrow" data-rise>Experience</p>
          <h2 id="path-title" className="headline" data-rise style={{ '--rise': 1, marginBottom: 40 }}>Places I’ve learned.</h2>
          <ol className="timeline" data-rise>
            {TIMELINE.map((entry) => (
              <li key={`${entry.title}-${entry.where}`}>
                <time>{entry.when}</time>
                <h3>{entry.title}</h3>
                <p className="where">{entry.where}</p>
                <ul>{entry.points.map((point) => <li key={point}>{point}</li>)}</ul>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="soft section" aria-labelledby="skills-title">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow" data-rise>Professional toolkit</p>
              <h2 id="skills-title" className="headline" data-rise style={{ '--rise': 1 }}>What I work with.</h2>
              <p className="lede" data-rise style={{ '--rise': 2 }}>Things I've learned for work. Not a complete inventory of my curiosity.</p>
            </div>
          </div>
          <SpotlightGroup>
            <div className="grid grid-3 stagger" data-rise>
              {SKILLS.map((group) => (
                <div key={group.group} className="card is-hover">
                  <h3 style={{ fontSize: 19 }}>{group.group}</h3>
                  <div className="tags" style={{ marginTop: 16 }}>
                    {group.items.map((item) => <span key={item} className="tag">{item}</span>)}
                  </div>
                </div>
              ))}
              <div className="card is-hover">
                <h3 style={{ fontSize: 19 }}>Certificates</h3>
                <ul className="points" style={{ marginTop: 16 }}>
                  {CERTIFICATES.map((item) => <li key={item} style={{ fontSize: 15 }}>{item}</li>)}
                </ul>
              </div>
            </div>
          </SpotlightGroup>
        </div>
      </section>

      <section className="solid section" aria-labelledby="beyond-title">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow" data-rise>Learning by making</p>
              <h2 id="beyond-title" className="headline" data-rise style={{ '--rise': 1 }}>Questions I tried answering by building.</h2>
            </div>
          </div>
          <SpotlightGroup>
            <div className="grid grid-3 stagger" data-rise>
              <Link href="/projects/connect-to-nature" className="card">
                <div className="card-kicker">Full-stack product</div>
                <h3>Connect to Nature</h3>
                <p>A farm-stay marketplace in English, Hindi and Marathi, with a farmer portal and a trip planner.</p>
              </Link>
              <Link href="/projects/rakta-setu" className="card">
                <div className="card-kicker">Automation + health</div>
                <h3>Rakta-Setu</h3>
                <p>Blood reports sent on WhatsApp in Marathi, with a voice page that explains each result.</p>
              </Link>
              <Link href="/projects/wildlife-conservation" className="card">
                <div className="card-kicker">Machine learning</div>
                <h3>Wildlife Conservation Analysis</h3>
                <p>YOLOv5 and Inception V3 to count animals and check species status. Copyright-registered.</p>
              </Link>
            </div>
          </SpotlightGroup>
        </div>
      </section>
    </main>
  );
}
