import Link from 'next/link';
import FilmAccordion from '../../components/FilmAccordion';
import './v2.css';
import { PERSON, TIMELINE } from '../../components/site';

export const metadata = {
  title: 'A little more about me | Gaurav — V2',
  description: 'A personal tour through what I build, how I think, what I am learning, and the things I enjoy outside the laptop.',
  alternates: { canonical: '/v2' },
  openGraph: { title: 'Gaurav, beyond the job title', description: 'Software, experiments, stories, and a little curiosity. Come on in.', url: '/v2' },
};

const aiProjects = [
  { n:'01', kind:'Built · interactive learning', title:'An AI agent, one step at a time', teaser:'I wanted to see how an agent decides what happens next — including when it should ask a person.', why:'An agent is more than a chat box. The interesting part is deciding what it should do after every step.', how:'A visual LangGraph-style game lets you connect decisions, test different inputs, and see where the workflow goes.', hard:'Making the choices easy to follow without pretending the game calls a live model.', learned:'Good agent workflows need clear paths, safe stopping points, and room for human approval.', next:'Try more real tool integrations, with proper permissions and checks.', href:'/lab', stack:['Agent workflows','Graph logic','React'] },
  { n:'02', kind:'Built · interactive learning', title:'When an AI answer looks right', teaser:'I made a small evaluation playground to explore why a convincing answer is not always a correct one.', why:'A neatly written AI answer can still miss an important fact. I wanted an easier way to explain that.', how:'The LLM test gate runs structure, fact, and meaning checks over prepared examples. It is a browser exercise, not a live model evaluator.', hard:'Showing the difference between format checks and facts that need real evidence.', learned:'A good output format is helpful, but checking the source matters more.', next:'Explore versioned evaluation sets and real model outputs.', href:'/lab', stack:['LLM evaluation','Guardrails','JavaScript'] },
  { n:'03', kind:'Built · site assistant', title:'Ask my website a question', teaser:'Instead of making someone hunt for a detail, I built a way to ask about my work in normal words.', why:'Not everyone wants to read through an entire portfolio just to find one answer.', how:'The assistant searches my existing pages, picks relevant passages, and shows where the answer came from. Optional Gemini phrasing depends on server configuration.', hard:'Keeping the answers grounded in what I have actually written.', learned:'Retrieval and honest sources matter more than sounding impressive.', next:'Keep improving the way related questions are understood.', href:'/ask', stack:['RAG','BM25 retrieval','Next.js'] },
];

const engProjects = [
  { n:'01', kind:'Built · live demo', title:'I built a little database', teaser:'QueryLite started with one question: what actually happens when I run SQL?', why:'I use databases all the time, but I wanted to understand the machinery behind a query.', how:'It reads SQL, makes a plan, chooses an index or scan, and shows the answer. You can try the browser console yourself.', hard:'Getting different query plans to return the same correct result.', learned:'Fast software is often about choosing the right work, not just doing work faster.', next:'Make the query planner easier to explore for beginners.', href:'/projects/querylite', stack:['JavaScript','SQL parser','B+ tree'] },
  { n:'02', kind:'Built · live demo', title:'What if one computer goes quiet?', teaser:'A visual Raft experiment about how a group of machines agrees, even when some fail.', why:'Distributed systems sounded mysterious until I tried to make the rules visible.', how:'The simulator lets servers elect a leader, exchange messages, crash, and recover.', hard:'Keeping the safety rules right through failures and network splits.', learned:'Small failure cases teach a lot about big systems.', next:'Add clearer explanations of each decision as it happens.', href:'/projects/raft-consensus', stack:['JavaScript','Raft','Simulation'] },
  { n:'03', kind:'Built · live demo', title:'Two people, one document', teaser:'A small shared editor where changes can meet again after going offline.', why:'I was curious how collaborative editing works when two people type at once.', how:'A CRDT joins changes in a stable order. You can try syncing two browser tabs.', hard:'Handling edits that arrive late, twice, or out of order.', learned:'A good merge rule makes collaboration feel simple.', next:'Make the editing timeline easier to see.', href:'/projects/crdt-editor', stack:['CRDT','React','BroadcastChannel'] },
  { n:'04', kind:'Built · product project', title:'A farm stay, closer to home', teaser:'Connect to Nature explores a simpler way for local farm hosts and travellers to find each other.', why:'A local experience deserves a simple way to be discovered.', how:'The project has farmer and traveller views, with Marathi-friendly screens and a shared database.', hard:'Making two very different kinds of users feel at home in one product.', learned:'The best interface is often the one that needs less explaining.', next:'Learn from real host and traveller feedback before expanding.', href:'/projects/connect-to-nature', stack:['Next.js','Supabase','Marathi UI'] },
  { n:'05', kind:'Built · automation project', title:'Helping a health report make sense', teaser:'Rakta-Setu explores blood-report delivery and plain-language explanations in Marathi.', why:'A report is only useful when someone can receive it and understand what it says.', how:'The project links report handling, WhatsApp delivery, and a voice-friendly explanation page.', hard:'Keeping sensitive health information clear and avoiding unsafe guesses.', learned:'With health information, being careful matters more than adding clever features.', next:'Improve review and real-world reliability before broader use.', href:'/projects/rakta-setu', stack:['Node.js','WhatsApp API','Marathi'] },
];

const indianFilms = [
  { title:'Sholay', year:'1975', maker:'Ramesh Sippy', thought:'The characters and conversations became part of Indian film history.' },
  { title:'Dilwale Dulhania Le Jayenge', year:'1995', maker:'Aditya Chopra', thought:'A love story people have carried with them for decades.' },
  { title:'Dangal', year:'2016', maker:'Nitesh Tiwari', thought:'A story about family, effort, expectations, and fighting for a chance.' },
  { title:'Baahubali 2: The Conclusion', year:'2017', maker:'S. S. Rajamouli', thought:'An example of how huge a story can feel when visuals and emotion meet.' },
  { title:'3 Idiots', year:'2009', maker:'Rajkumar Hirani', thought:'One I personally love. Funny, emotional, and full of questions about how we learn.' },
];
const worldFilms = [
  { title:'The Shawshank Redemption', year:'1994', maker:'Frank Darabont', thought:'Hope and friendship inside a story that stays with audiences.' },
  { title:'The Godfather', year:'1972', maker:'Francis Ford Coppola', thought:'Family, power, and choices that never feel simple.' },
  { title:'The Dark Knight', year:'2008', maker:'Christopher Nolan', thought:'A crime story, a superhero story, and a complicated moral puzzle.' },
  { title:"Schindler’s List", year:'1993', maker:'Steven Spielberg', thought:'A difficult but important story about history and humanity.' },
  { title:'The Lord of the Rings: The Return of the King', year:'2003', maker:'Peter Jackson', thought:'An epic finale that shows the power of a world built with care.' },
];

const questions = [
  ['Are you only interested in AI?','Not at all. I like backend engineering, databases, automation, useful interfaces, and the quiet work of making things reliable. AI is one more interesting part of that.'],
  ['What do you do at work?','I work on software quality and automation, especially API flows. That has taught me how many small parts need to work together for a system to feel trustworthy.'],
  ['Why do you keep building small experiments?','Because reading helps me understand an idea, but building it shows me what I still do not understand. Small projects make the questions real.'],
  ['Are all these projects production products?','No. Some are live browser experiments, some are product builds, and some work is still being explored. I label them so you can tell the difference.'],
  ['What are you looking for next?','I want to keep getting better at shipping useful software, especially tools that connect AI with real tasks and real people.'],
];

export default function PortfolioV2() {
  return <main id="main" className="story-v2">
    <div className="story-shell">
      <header className="story-nav">
        <Link className="story-mark" href="/v2" aria-label="Gaurav portfolio version two">g<span>.</span></Link>
        <nav aria-label="Story chapters"><a href="#films">Films</a><a href="#my-story">My story</a><a href="#things-i-build">Projects</a><a href="#curiosity">Curiosity</a><a href="#say-hello">Hello</a></nav>
        <Link className="story-original" href="/">Original site ↗</Link>
      </header>

      <section className="story-hero" aria-labelledby="story-title">
        <div className="story-hero-top"><span>ANOTHER SIDE OF MY STORY</span><span>01 — WELCOME</span></div>
        <h1 id="story-title">I like figuring<br/>things <em>out.</em><br/><span>And sometimes,</span><br/>building them<span className="story-dot">.</span></h1>
        <div className="story-hero-bottom">
          <div className="story-portrait"><img src="https://avatars.githubusercontent.com/u/304623412?v=4" alt="Gaurav's GitHub profile picture" width="190" height="190"/><span>that's me ↗</span></div>
          <div className="story-intro"><p>Hey, I'm Gaurav.</p><p>I write software, explore AI, watch movies, and think about ideas that probably don't need this much thinking.</p><p>Sometimes I build a small tool. Sometimes something bigger. And sometimes I spend hours finding out why one tiny thing won't work.</p><p>That's part of the fun, I guess.</p><a className="story-button" href="#my-story">Come, I'll show you around <span>↘</span></a></div>
        </div>
      </section>

      <section className="story-section story-films" id="films" aria-labelledby="films-title">
        <div className="story-eyebrow"><span>A LITTLE DETOUR / FILMS &amp; STORIES</span><span>BEFORE WE TALK ABOUT CODE</span></div>
        <div className="story-films-opening">
          <div>
            <span className="story-film-ticket" aria-hidden="true">A SEAT. A SCREEN. A WHOLE NEW WORLD.</span>
            <h2 id="films-title">I love watching<br/><em>films alone.</em> <span aria-label="Eyes and popcorn" role="img">👀 🍿</span></h2>
          </div>
          <div className="story-prose">
            <p>There's something I really enjoy about watching a film on my own. No one talking over the best scene. Just me, the screen, and a story I can get completely lost in.</p>
            <p>I love crime thrillers too. The clues, the twists, the moment you realise you missed something important — we all know that feeling, right?</p>
            <p><strong>3 Idiots</strong> is one of the films I love. And <strong>Game of Thrones</strong> — yes, it's a series, not a film — is another story world I love thinking about. The characters, the emotions, the scale. There's so much to notice.</p>
            <p>Now here's the engineer in me: while I'm watching, I sometimes wonder how people make a world like that feel real. Can AI help someone plan scenes, try camera angles, or build visual ideas? And can it do that without losing the human part that makes a story worth watching?</p>
            <p>I'm curious about using AI to explore storytelling and visuals realistically. I'm learning what's possible, what still looks wrong, and why good stories need more than a clever tool. I'm not claiming I've recreated these films — it's a question I want to keep exploring.</p>
            <p>And I like watching a scene more than once. The first time, I'm following the story. The second time, I start noticing the little things: a silence, a camera move, the music arriving at just the right moment.</p>
            <p>Sometimes I wonder: if I had a story in my head, could I make a small, believable scene using AI? Not a copy of someone else's film. Something original, with its own people and its own feeling. That's what I'd love to learn.</p>
          </div>
        </div>
        <div className="story-film-interlude">
          <div className="story-film-interlude-heading"><span>THE KIND OF FILMS THAT KEEP ME THINKING</span><h3>I love the moment<br/><em>the story turns.</em></h3></div>
          <div className="story-film-interlude-copy">
            <p>Crime thrillers have a special place for me. A small clue appears. Someone says something ordinary. And later, suddenly, that little moment means everything.</p>
            <p>I love that feeling of trying to solve the story before the film does. I get it wrong plenty of times. That's probably why I enjoy it.</p>
            <p>But I also love funny films, emotional journeys, and big worlds where every character seems to have a story of their own. Good storytelling doesn't belong to just one genre.</p>
          </div>
        </div>
        <div className="story-film-scroll-note"><span aria-hidden="true">↓</span><p>Keep scrolling. These are a few stories worth talking about.</p></div>
        <div className="story-film-favorites">
          <span className="story-film-mini-label">THE TWO I'VE MENTIONED FIRST</span>
          <div><span>01</span><strong>3 Idiots</strong><small>A film I love</small></div>
          <div><span>02</span><strong>Game of Thrones</strong><small>A series I love</small></div>
        </div>
        <div className="story-film-collections">
          <div className="story-film-column">
            <div className="story-film-list-head"><span>01 / FROM INDIA</span><h3>Stories that shaped<br/><em>our cinema.</em></h3><p>Five widely celebrated Indian films. I like looking at why stories like these stay with people.</p></div>
            {indianFilms.map(film => <FilmAccordion key={film.title} film={film}/>)}
          </div>
          <div className="story-film-column">
            <div className="story-film-list-head"><span>02 / FROM AROUND THE WORLD</span><h3>Stories that travelled<br/><em>everywhere.</em></h3><p>Five acclaimed films from world cinema, each memorable for a different reason.</p></div>
            {worldFilms.map(film => <FilmAccordion key={film.title} film={film}/>)}
          </div>
        </div>
        <p className="story-film-afterthought">This isn't a scientific ranking or a list of everything I've watched. It's a small collection of loved and influential stories. My own favorites are the ones I've called out above.</p>
      </section>

      <div className="story-marquee" aria-label="A few things about me"><span>STILL LEARNING</span><b>✳</b><span>MAKING THINGS</span><b>✳</b><span>GOOD STORIES</span><b>✳</b><span>BETTER QUESTIONS</span></div>

      <section className="story-section story-about" id="my-story" aria-labelledby="story-about-title">
        <div className="story-eyebrow"><span>02 / MY STORY</span><span>LET'S START HERE</span></div>
        <div className="story-split"><h2 id="story-about-title">I'm more than<br/>what I do <em>for work.</em></h2><div className="story-prose"><p>Hi again. I'm Gaurav Suryavanshi.</p><p>I work in software and automation. But if you ask me what I enjoy most, I would probably say: trying to understand how things actually work.</p><p>I like taking a big, confusing problem and making it smaller. Then smaller again. Until I can explain it in words that make sense.</p><p>I've also taught engineering mathematics. Explaining something until it finally clicks for another person is a feeling I really like.</p><p>I still think of myself as a student. A job doesn't change that.</p><p className="story-handnote">I ask a lot of questions. You have been warned. ↗</p></div></div>
      </section>

      <section className="story-section" id="journey" aria-labelledby="journey-title">
        <div className="story-eyebrow"><span>03 / THE JOURNEY</span><span>NO SHORTCUTS</span></div>
        <h2 id="journey-title">I didn't learn it<br/><em>all in one day.</em></h2>
        <p className="story-lede">A few real stops along the way. Each one taught me something I couldn't get from a tutorial alone.</p>
        <div className="story-timeline">{TIMELINE.map((step,i)=><article key={step.when+step.title} className="story-time-row"><span className="story-time-date">{step.when}</span><div><span className="story-time-n">{String(i+1).padStart(2,'0')}</span><h3>{step.title}</h3><p className="story-time-place">{step.where}</p><p>{i===0?'I work with API flows where a small mistake can affect the whole journey. Making checks clear and repeatable has taught me to think carefully about how systems fit together.':i===1?'I worked on turning real API traffic from logs into something a developer could use again. It showed me how much time a well-placed tool can save.':i===2?'I got to build backend features, live messaging, and chatbot integration. It was a chance to see a product beyond a single API call.':'Computer science gave me the basics. The more interesting part was discovering how many questions those basics open up.'}</p></div></article>)}</div>
      </section>

      <section className="story-section story-projects" id="things-i-build" aria-labelledby="projects-title">
        <div className="story-eyebrow"><span>04 / THINGS I BUILD</span><span>LEARN BY MAKING</span></div>
        <h2 id="projects-title">Okay, enough about me.<br/><em>Here's the work.</em></h2>
        <p className="story-lede">These aren't just names and technology badges. Every one started with a question. Open a project to see the full build, or read the little story right here.</p>
        <div className="story-group"><div className="story-group-head"><span>01 / AI & LLM ENGINEERING</span><p>I'm exploring what software can do when it can follow a task, search for context, and check its own work.</p></div>
          {aiProjects.map(p=><ProjectStory key={p.n} project={p}/>)}
        </div>
        <div className="story-group"><div className="story-group-head"><span>02 / ENGINEERING & AUTOMATION</span><p>Some of my favourite projects are about things that should simply work — even when everything gets complicated underneath.</p></div>
          {engProjects.map(p=><ProjectStory key={p.n} project={p}/>)}
        </div>
        <Link className="story-text-link" href="/projects">See the full project archive ↗</Link>
      </section>

      <section className="story-section story-skills" id="what-i-know" aria-labelledby="skills-title">
        <div className="story-eyebrow"><span>05 / WHAT I CAN DO</span><span>AND WHAT I'M LEARNING</span></div>
        <h2 id="skills-title">Some things I know.<br/><em>A lot more I'm learning.</em></h2>
        <div className="story-skills-grid">
          <article><span>01</span><h3>Backend and APIs</h3><p>I use Java and JavaScript tools to work with services, requests, data, and the less-visible side of applications.</p><small>Java · Spring Boot · Node.js · REST</small></article>
          <article><span>02</span><h3>Automation</h3><p>I've learned that software should not just work once. It should keep working when people change things around it.</p><small>TestNG · Rest-Assured · CI/CD</small></article>
          <article><span>03</span><h3>Products and interfaces</h3><p>I like making practical tools that someone can understand without sitting through a long explanation.</p><small>React · Next.js · Supabase</small></article>
          <article><span>04</span><h3>AI workflows</h3><p>I'm building and studying retrieval, agent flows, and output checks — with a lot of attention to where they can go wrong.</p><small>RAG · Tool flows · Evaluation</small></article>
        </div>
      </section>

      <section className="story-section story-curiosity" id="curiosity" aria-labelledby="curiosity-title">
        <div className="story-eyebrow"><span>06 / THE BIG QUESTION</span><span>STILL EXPLORING</span></div>
        <h2 id="curiosity-title">What if software could<br/>do a <em>little more?</em></h2>
        <div className="story-split story-curiosity-content"><div className="story-quote">“What should we automate — and what should a person still decide?”</div><div className="story-prose"><p>Most software waits for us to click the next button.</p><p>AI agents make me wonder what happens when software can understand a task, choose a tool, and help finish a few steps on its own.</p><p>But I think the more important questions are about mistakes. What happens when the tool fails? When the information is wrong? When a person should approve something first?</p><p>I want to learn to build systems that are useful <em>and</em> sensible. Not just impressive for thirty seconds.</p><Link className="story-text-link" href="/lab">Try a few of my experiments ↗</Link></div></div>
      </section>

      <section className="story-section story-life" id="outside-work" aria-labelledby="life-title">
        <div className="story-eyebrow"><span>07 / OFF THE CLOCK</span><span>THE HUMAN PART</span></div>
        <h2 id="life-title">Anyway, life isn't<br/>only about <em>code.</em></h2>
        <div className="story-life-grid"><article><span>01 / THE MOVIE PERSON</span><h3>A good story stays with me.</h3><p>I love films, especially the kind that leave you thinking long after the credits. Sometimes a good story gives me more ideas than another hour online.</p></article><article><span>02 / THE CURIOUS PERSON</span><h3>One more question.</h3><p>I can get very interested in something small. How it works. Why people use it. Whether it could be easier. That curiosity is part of who I am.</p></article><article><span>03 / THE REAL-LIFE PERSON</span><h3>There's a world beyond the screen.</h3><p>Family, conversations, little moments, and time away from work matter too. I'm learning to make space for all of it.</p></article></div>
      </section>

      <section className="story-section story-faq" aria-labelledby="faq-title">
        <div className="story-eyebrow"><span>08 / YOU MIGHT BE WONDERING</span><span>A FEW ANSWERS</span></div>
        <h2 id="faq-title">A few things<br/><em>you could ask me.</em></h2>
        <div className="story-questions">{questions.map(([q,a],i)=><details key={q}><summary><span>{String(i+1).padStart(2,'0')}</span>{q}<b aria-hidden="true">+</b></summary><p>{a}</p></details>)}</div>
      </section>

      <section className="story-end" id="say-hello" aria-labelledby="end-title"><span className="story-end-label">09 / THE END? MAYBE NOT.</span><h2 id="end-title">Well, that's a little<br/><em>about me.</em></h2><p>If you've made it this far, thank you. If you're building something interesting, have an idea, or just want to talk about technology, feel free to say hello.</p><p>And if you have a good movie recommendation, that works too.</p><a href={'mailto:'+PERSON.email} className="story-end-button">Say hello <span>↗</span></a><div className="story-end-links"><a href={PERSON.github} target="_blank" rel="noopener noreferrer">GitHub ↗</a><Link href="/writing">My writing ↗</Link><Link href="/">Back to the original ↗</Link></div></section>
      <footer className="story-footer"><span>© {new Date().getFullYear()} Gaurav Suryavanshi. Still figuring things out.</span><a href="#main">Back to top ↑</a></footer>
    </div>
  </main>;
}

function ProjectStory({project:p}) {
  return <article className="story-project">
    <div className="story-project-index">{p.n}<span>↗</span></div>
    <div className="story-project-main"><span className="story-status">{p.kind}</span><h3>{p.title}</h3><p className="story-project-teaser">{p.teaser}</p><details className="story-project-details"><summary>Read the story behind this project <span aria-hidden="true">+</span></summary><div className="story-detail-grid"><div><b>Why I made it</b><p>{p.why}</p></div><div><b>How it works</b><p>{p.how}</p></div><div><b>The tricky part</b><p>{p.hard}</p></div><div><b>What I learned</b><p>{p.learned}</p></div><div><b>What I'd improve</b><p>{p.next}</p></div><div><b>The technical side</b><p>{p.stack.join(' · ')}</p></div></div></details><Link href={p.href} className="story-project-link">Explore the working project ↗</Link></div>
  </article>;
}
