# Gaurav Suryavanshi

Pune, India · gauravsuryvanshi06@gmail.com · github.com/suryavanshi-cmd · gauravspace.com

## SUMMARY

Backend engineer with production experience in Node.js, NestJS and Java, currently
working as an SDET on health-insurance claims APIs at a TPA processing partner
integrations at scale. Two backend engineering internships building REST services,
real-time messaging and microservices. Independently implemented Raft consensus, an
RGA text CRDT and a SQL query engine with a B-tree storage layer — all test-covered
and public. Strong on data structures, algorithms and distributed-systems correctness.

## SKILLS

Languages: JavaScript, TypeScript, Java 17, Python, SQL / PLSQL, C++
Backend: Node.js, Express, NestJS, Spring Boot, REST APIs, WebSockets (Socket.io),
  Server-Sent Events, JWT authentication, middleware, microservices
Databases: Oracle SQL / PLSQL, MongoDB, SQLite, schema design, query optimization,
  database migrations, blue-green deployment validation
Systems: Raft consensus, CRDTs, B-tree indexing, query planning, concurrency,
  deterministic simulation testing
Testing: Rest-Assured, TestNG, JUnit, Selenium, Postman, Bruno, contract testing,
  data-driven and parallel execution
Tools and CI: Git, GitHub, Docker, Maven, CI/CD pipelines, ELK stack

## EXPERIENCE

### Software Development Engineer in Test — Vidal Health TPA, Pune
2024 – Present

- Own the Java 17, TestNG and Rest-Assured framework covering health-insurance
  claims APIs, including request/response schema validation and database-level
  assertions against Oracle.
- Built a partner-integration regression suite of 190+ test cases validating
  multi-party claim workflows end to end.
- Tuned TestNG for parallel execution, cutting regression runtime and stabilising
  CI builds across environments.
- Validated database migrations, blue-green deployments and real-time claim status
  flows delivered over Server-Sent Events.

### Backend Automation Test Intern — Bajaj Finserv Health
2024

- Built a microservice that parsed HTTPS traffic logs from the ELK stack, generated
  equivalent curl requests, and replayed them as an automated regression suite.
- Migrated the service from Node.js to NestJS for improved throughput and a
  modular, scalable architecture.

### Backend Developer Intern — Esenceweb IT Solutions
2024

- Built REST services in Node.js and Express backed by MongoDB, with JWT-based
  authentication and middleware.
- Implemented real-time messaging over Socket.io and integrated a Dialogflow
  conversational agent.

## PROJECTS

### Raft consensus implementation — 346 lines, JavaScript
Implemented the Raft algorithm (leader election, log replication, commit rules) as a
deterministic simulation with a seeded random generator, so any run replays exactly.
Property tests run thousands of randomized executions with induced crashes and network
partitions, asserting all four safety invariants after every step: election safety, log
matching, leader completeness and state machine safety.

### QueryLite — SQL database engine, 1,540 lines, JavaScript
A working relational engine: SQL parser (423 lines), query execution engine (819 lines)
and a B-tree storage and indexing layer (222 lines). Covers parsing, planning and
on-disk ordered access.

### RGA text CRDT — 175 lines, JavaScript
Replicated Growable Array for collaborative text editing. Lamport-clock identifiers,
tombstone deletion, idempotent operation application and a causal buffer for
out-of-order delivery, so replicas edit offline and converge without a server or locks.

### Portfolio with grounded retrieval API — Next.js on Cloudflare Workers
Full-stack site with a retrieval-augmented question endpoint over a corpus of my own
project writeups. Covers document parsing, chunking, grounding and the persistence
path, with 40 passing tests. Deployed to Cloudflare Workers via the OpenNext adapter.

## EDUCATION

### B.E. Computer Science — PCCOER, Pune
2020 – 2024 · CGPA 8.96 / 10

Honours project: Wildlife Conservation Analysis using Machine Learning
(copyright-registered).

## CERTIFICATIONS

Introduction to Generative AI (Udemy) · Introduction to Machine Learning (Coursera) ·
Java (Udemy) · Copyright registration: Wildlife Conservation and Analysis Using
Machine Learning
