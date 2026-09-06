import { projects } from '../projects';
import { posts } from '../posts';

/*
  The corpus the assistant answers from.

  Everything here is derived from content already on the site — the résumé
  facts, the project write-ups, the articles — so the assistant can only ever
  repeat something Gaurav has actually published. It cannot invent a fact,
  because it has no generation step: it retrieves a passage and shows it with a
  link to where it came from.

  Chunking is per-idea rather than per-document. A whole article is a poor unit
  of retrieval: it matches many queries weakly and answers none of them
  precisely. A paragraph or a single résumé fact matches fewer queries and
  answers them exactly.
*/

/* Résumé facts, taken from public/Gaurav-Suryavanshi-Resume.pdf. `weight`
   lifts the handful of documents that answer a question directly, so "how do I
   reach you" ranks the contact card above an article mentioning email. */
const facts = [
  {
    id: 'role',
    title: 'Current role',
    text: 'Gaurav Suryavanshi is a Software Development Engineer in Test (SDET) at Vidal Health TPA in Pune, since 2024. He owns and extends a Java 17 + TestNG + Rest-Assured API automation framework for health-insurance claims processing, covering end-to-end claim, enrollment and partner-integration flows.',
    keywords: ['now', 'current', 'today', 'employer', 'company', 'sdet', 'vidal'],
    weight: 1.25,
  },
  {
    id: 'experience',
    title: 'Experience',
    text: 'He has 2+ years in test automation and is based in Pune, India. Before Vidal Health he was a Backend Automation Test Intern at Bajaj Finserv Health in 2024, and a Backend Developer Intern at Esenceweb IT Solutions in 2024.',
    keywords: ['years', 'senior', 'long', 'history', 'career', 'intern'],
    weight: 1.25,
  },
  {
    id: 'scale',
    title: 'Automation at scale',
    text: 'He designed and automated a partner-integration regression suite of 190+ test cases across multiple REST APIs, with request/response schema validation and database-level assertions. He tuned TestNG suites for parallel execution, reducing regression run time and stabilising CI feedback across release cycles.',
    keywords: ['190', 'regression', 'suite', 'parallel', 'ci', 'scale', 'impact', 'many', 'count', 'number', 'cases', 'automated'],
    weight: 1.1,
  },
  {
    id: 'backend',
    title: 'Backend development',
    text: 'As a Backend Developer Intern at Esenceweb IT Solutions he built services in Node.js and Express with MongoDB, JWT auth and real-time messaging over Socket.io, plus a Dialogflow chatbot for automated responses. At Bajaj Finserv Health he built a microservice that generated and executed curl commands from HTTPS response logs pulled off the ELK stack, then migrated it from Node.js to NestJS for better performance and scalability.',
    keywords: ['developer', 'build', 'services', 'node', 'nestjs', 'express', 'mongodb', 'socket', 'microservice'],
    weight: 1.15,
  },
  {
    id: 'skills',
    title: 'Technical skills',
    text: 'Test automation: Rest-Assured, TestNG, JUnit, Selenium, Postman, Bruno, API contract and regression suites, data-driven and parallel execution. Languages: Java 17, JavaScript/TypeScript, Python, SQL/PLSQL, C++. Backend and services: Spring Boot, Node.js, Express, NestJS, REST APIs, SSE, JWT auth, microservices. Databases: Oracle SQL/PLSQL, MongoDB, SQLite, with query-level assertions and EBR / blue-green validation. Tooling and CI: Git, GitHub, Docker, Maven, CI/CD pipelines, ELK, JSON/HAR-driven test tooling.',
    keywords: ['tech', 'stack', 'languages', 'tools', 'java', 'python', 'sql', 'docker', 'know'],
    weight: 1.2,
  },
  {
    id: 'ml',
    title: 'Machine learning work',
    text: 'His Wildlife Conservation Analysis project is a computer-vision pipeline in Python using YOLOv5 and Inception V3. It counts wildlife populations from images and video and classifies species against IUCN Red List criteria. It is registered as a copyright: Wildlife Conservation and Analysis Using Machine Learning. He also holds certificates in Introduction to Generative AI (Udemy) and Introduction to Machine Learning (Coursera).',
    keywords: ['ai', 'ml', 'vision', 'yolo', 'python', 'copyright', 'wildlife', 'model', 'certificate'],
    weight: 1.15,
  },
  {
    id: 'education',
    title: 'Education',
    text: 'Bachelor of Engineering in Computer Science from PCCOER, Pune, August 2020 to May 2024, with a CGPA of 8.96 out of 10. Certifications: Introduction to Generative AI (Udemy), Introduction to Machine Learning (Coursera), Java (Udemy).',
    keywords: ['degree', 'college', 'university', 'cgpa', 'graduate', 'studied', 'school'],
    weight: 1.2,
  },
  {
    id: 'contact',
    title: 'Getting in touch',
    text: 'Gaurav is open to SDET, API test automation, and LLM application engineering roles. The fastest way to reach him is email at gauravsuryvanshi06@gmail.com. His code is on GitHub at github.com/suryavanshi-cmd, and his résumé PDF is downloadable from this site.',
    keywords: ['email', 'reach', 'hire', 'hiring', 'available', 'cv', 'resume', 'github', 'linkedin'],
    weight: 1.35,
    href: 'mailto:gauravsuryvanshi06@gmail.com',
    hrefLabel: 'Email Gaurav',
  },
  {
    id: 'assistant',
    title: 'How this assistant works',
    text: 'This assistant is a retrieval system, not a language model. It indexes the résumé facts, project write-ups and articles on this site with BM25, retrieves the best-matching passages for your question, and shows them with a link to the source. It runs entirely in your browser: no API key, no request leaves the page, and it cannot invent a fact because it has no generation step.',
    keywords: ['bot', 'chatbot', 'assistant', 'rag', 'work', 'built', 'llm', 'ai', 'you'],
    weight: 1.1,
  },
];

function buildProjectDocs() {
  return projects.map((project) => ({
    id: `project:${project.title}`,
    title: project.title,
    text: [project.note, project.problem, project.outcome, `Built with ${project.stack.join(', ')}.`]
      .filter(Boolean)
      .join(' '),
    keywords: [...project.stack, 'project', 'built'],
    source: 'Project',
    href: '#projects',
    hrefLabel: 'See projects',
  }));
}

function buildPostDocs() {
  const docs = [];
  for (const post of posts) {
    docs.push({
      id: `post:${post.slug}`,
      title: post.title,
      text: post.summary,
      keywords: [...(post.tags || []), 'article', 'wrote', 'writing'],
      source: 'Writing',
      href: `/blog/${post.slug}`,
      hrefLabel: 'Read the post',
    });
    /* Body paragraphs are indexed separately: a specific question is usually
       answered by one paragraph, and retrieving the whole article would bury
       it. Short ones are skipped — they are transitions, not answers. */
    post.body
      .filter((block) => block.type === 'p' && block.text.length > 180)
      .forEach((block, i) => {
        docs.push({
          id: `post:${post.slug}:${i}`,
          title: post.title,
          text: block.text,
          keywords: post.tags || [],
          source: 'Writing',
          href: `/blog/${post.slug}`,
          hrefLabel: 'Read the post',
        });
      });
  }
  return docs;
}

export function buildCorpus() {
  return [
    ...facts.map((fact) => ({ ...fact, source: fact.source || 'Résumé' })),
    ...buildProjectDocs(),
    ...buildPostDocs(),
  ];
}

export const SUGGESTIONS = [
  'What does Gaurav do now?',
  'What is his tech stack?',
  'Has he built AI or ML things?',
  'How do I contact him?',
];
