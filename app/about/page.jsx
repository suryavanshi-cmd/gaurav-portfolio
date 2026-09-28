import Link from 'next/link';
import { CopyEmail, PuneClock, SpotlightGroup } from '../../components/ui';
import { CERTIFICATES, PERSON, SKILLS, TIMELINE } from '../../components/site';

export const metadata = {
  title: 'About',
  description:
    'About Gaurav Suryavanshi: SDET at Vidal Health TPA in Pune, former backend developer and backend automation intern, B.E. Computer Science (CGPA 8.96), with a copyright-registered machine-learning project.',
  alternates: { canonical: '/about' },
  openGraph: { url: '/about', title: 'About — Gaurav Suryavanshi', type: 'profile' },
};

export default function AboutPage() {
  return (
    <main id="main">
      <section className="page-head">
        <div className="wrap about-top">
          <div>
            <p className="eyebrow" data-rise>About</p>
            <h1 className="display" data-rise style={{ '--rise': 1 }}>Hi, I’m Gaurav.</h1>
            <p className="lede" data-rise style={{ '--rise': 2 }}>
              I’m an SDET in {PERSON.city}. For 2+ years I have built and owned API test automation for large
              health-insurance claims systems — where a bug doesn’t just look wrong, it reaches somebody’s claim.
            </p>
            <p className="lede" data-rise style={{ '--rise': 3 }}>
              I’ve also worked as a backend developer — Node.js services, real-time chat, a chatbot. I still build: full
              apps, LLM tools and the live demos on this site. Building a thing is the best way to learn how to break it.
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
          <h2 id="path-title" className="headline" data-rise style={{ '--rise': 1, marginBottom: 40 }}>The path so far.</h2>
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
              <p className="eyebrow" data-rise>Skills</p>
              <h2 id="skills-title" className="headline" data-rise style={{ '--rise': 1 }}>What I work with.</h2>
              <p className="lede" data-rise style={{ '--rise': 2 }}>Grouped the way my résumé groups them.</p>
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
              <p className="eyebrow" data-rise>Beyond testing</p>
              <h2 id="beyond-title" className="headline" data-rise style={{ '--rise': 1 }}>Things I build on my own.</h2>
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
