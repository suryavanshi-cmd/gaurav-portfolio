/*
  Site-wide facts, in one place.

  Everything here comes from public/Gaurav-Suryavanshi-Resume.pdf, which is the
  source of truth for the whole site. When the résumé changes, change it here
  and in the about-page timeline — nothing else restates these.
*/

/*
  The canonical origin, and the one fact here that is not from the résumé.

  Every absolute URL the site emits is built from this: the canonical link, the
  sitemap, robots.txt, and the OpenGraph and Twitter image URLs. So a wrong
  value here is not cosmetic — a `rel="canonical"` pointing at another host
  tells search engines to index that host instead of this one, and link
  previews fetch their images from it.

  `NEXT_PUBLIC_SITE_URL` overrides it, and being a NEXT_PUBLIC_ name it is
  inlined when the site is compiled rather than read at runtime: on Cloudflare
  it has to be a Workers Builds *build* variable, not a runtime secret. The
  fallback is the live domain so that a build which forgets to set it is still
  correct rather than quietly advertising somewhere else.
*/
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gauravspace.com').replace(/\/$/, '');

export const PERSON = {
  name: 'Gaurav Suryavanshi',
  role: 'Software Development Engineer in Test (SDET)',
  shortRole: 'SDET',
  city: 'Pune',
  country: 'India',
  email: 'gauravsuryvanshi06@gmail.com',
  github: 'https://github.com/suryavanshi-cmd',
  resume: '/Gaurav-Suryavanshi-Resume.pdf',
  employer: 'Vidal Health TPA',
};

export const SITE = {
  title: 'Gaurav Suryavanshi — SDET, API automation and LLM tools',
  description:
    'Gaurav Suryavanshi is an SDET in Pune. He builds API test automation in Java 17, TestNG and Rest-Assured, writes backend services in Node.js and NestJS, and makes LLM tools and live demos you can try in the browser.',
  keywords: [
    'Gaurav Suryavanshi',
    'SDET',
    'API test automation',
    'Rest-Assured',
    'TestNG',
    'Java 17',
    'Node.js',
    'NestJS',
    'Oracle SQL',
    'LLM testing',
    'RAG',
    'System design',
    'Pune',
  ],
};

/* Skills exactly as grouped on the résumé. */
export const SKILLS = [
  { group: 'Test automation', items: ['Rest-Assured', 'TestNG', 'JUnit', 'Selenium', 'Postman', 'Bruno', 'Contract & regression suites', 'Data-driven & parallel runs'] },
  { group: 'Languages', items: ['Java 17', 'JavaScript', 'TypeScript', 'Python', 'SQL / PLSQL', 'C++'] },
  { group: 'Backend', items: ['Spring Boot', 'Node.js', 'Express', 'NestJS', 'REST APIs', 'SSE', 'JWT auth', 'Microservices'] },
  { group: 'Databases', items: ['Oracle SQL / PLSQL', 'MongoDB', 'SQLite', 'Query-level assertions', 'Blue-green validation'] },
  { group: 'Tools & CI', items: ['Git', 'GitHub', 'Docker', 'Maven', 'CI/CD', 'ELK', 'JSON / HAR tooling'] },
];

export const TIMELINE = [
  {
    when: '2024 — now',
    title: 'SDET',
    where: 'Vidal Health TPA, Pune',
    points: [
      'Own the Java 17 + TestNG + Rest-Assured framework that tests health-insurance claims APIs.',
      'Built a partner-integration regression suite of 190+ test cases, with schema and database checks.',
      'Tuned TestNG for parallel runs — faster regression, steadier CI.',
      'Tested database migrations, blue-green deploys and real-time (SSE) claim flows.',
    ],
  },
  {
    when: '2024',
    title: 'Backend Automation Test Intern',
    where: 'Bajaj Finserv Health',
    points: [
      'Built a microservice that turned HTTPS logs from the ELK stack into curl commands and ran them as tests.',
      'Moved it from Node.js to NestJS for better speed and scale.',
    ],
  },
  {
    when: '2024',
    title: 'Backend Developer Intern',
    where: 'Esenceweb IT Solutions',
    points: [
      'Built Node.js / Express services with MongoDB and JWT auth.',
      'Added real-time messaging with Socket.io and a Dialogflow chatbot.',
    ],
  },
  {
    when: '2020 — 2024',
    title: 'B.E. Computer Science',
    where: 'PCCOER, Pune',
    points: ['CGPA 8.96 / 10.', 'Honours project: Wildlife Conservation Analysis (copyright-registered).'],
  },
];

export const CERTIFICATES = [
  'Introduction to Generative AI — Udemy',
  'Introduction to Machine Learning — Coursera',
  'Java — Udemy',
  'Copyright: Wildlife Conservation and Analysis Using Machine Learning',
];

/* Résumé tools only. */
export const TICKER = [
  'Java 17', 'TestNG', 'Rest-Assured', 'JUnit', 'Selenium', 'Postman', 'Bruno', 'Oracle SQL',
  'Spring Boot', 'Node.js', 'NestJS', 'Express', 'MongoDB', 'Docker', 'Maven', 'Python',
  'YOLOv5', 'SSE', 'ELK',
];
