# Gaurav Suryavanshi Portfolio

A production-focused Next.js portfolio for an SDET and API-automation engineer who also builds LLM applications and developer tooling.

## Versions

Every version of the site stays online at its own address, each frozen with the
design it shipped with. A switcher in the header moves between them, and
`/versions` lists them all.

| Route | Version | Design |
| --- | --- | --- |
| `/` and `/v3` | **V3 — Notebook** (current) | One 40rem prose column, Inter, inline hoverable fact chips, dated lists |
| `/v2` | **V2 — Editorial** | Monochrome, Manrope + Inter, large radii, Light/Dark |
| `/v1` | **V1 — Terminal** | Neon-on-black, Anton + Chakra Petch, Dark/Cold/Summer/Rainy, OVERDRIVE mode |

Each version owns a complete global stylesheet, so they are kept apart by the
routing rather than by naming discipline:

- `app/layout.jsx` imports **no** CSS — only fonts (shared, because both
  versions read them as `:root` custom properties) and metadata.
- Each version imports its own design system: `app/v1/layout.jsx`,
  `app/(v2)/layout.jsx`, and `app/v3/page.jsx`. `/` lives at the app root
  (`app/page.jsx`) rather than in a route group, so it picks up the latest
  version's stylesheet and none of the others'.
- The switcher uses plain `<a>`, never `next/link`. Version changes must be full
  document loads, or the previous version's stylesheet stays attached and the
  two designs blend.
- Fonts are self-hosted from `assets/fonts` via `next/font/local`, so the build
  makes no network requests — see that folder's README for why. V1's four
  display families are declared with `preload: false`, so their files are only
  downloaded on the route that renders them (`/` fetches 3 woff2, `/v1` fetches 6).
- `latestVersionKey` in `app/versions.js` decides which version `/` serves and
  which one the switcher marks current.

To add a version: drop its page and CSS under a new route, give it a layout that
imports them, and add an entry to `app/versions.js` — the switcher and the
`/versions` index both read from that registry.

## What V2 — Editorial includes

- Calm, focused motion: a scroll-progress rail, subtle scroll reveals, and a light 3D tilt on cards — nothing that competes with the content
- Monochrome design system (Manrope + Inter, large-radius cards, hairline borders, no color accents) with a Light and Dark theme
- Numbered sections (01–06) with two-tone editorial headlines and a scrolling tech-stack strip
- Terminal-style status line and count-up metrics
- Hero "at a glance" card: location, experience, core stack, and direct GitHub / email links
- About section, and an FAQ answering the questions recruiters ask first
- Full résumé section (experience, projects, skills, education, certifications) with a downloadable PDF
- Four focused project collections:
  - LLM & AI Systems
  - Automation & Delivery
  - Web Server & Data
  - Personal & Academic Projects
- Recruiter-friendly case studies with architecture, impact, challenges, and future scope
- Interactive project modal with editable JSON workflow simulation
- Supabase-backed contact form through a validated Next.js API route
- Mobile, tablet, and desktop layouts
- Accessibility improvements, keyboard-close modal behavior, and full `prefers-reduced-motion` support that disables every effect layer
- Vercel-ready production configuration and metadata

## Stack

- Next.js 15
- React 19
- Supabase PostgreSQL and Row Level Security
- Vercel
- GitHub
- Apache HTTP Server / HTTPS project content
- Java, Node.js, Rest Assured, TestNG, Playwright, PostgreSQL, and SQLite project content

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Production build

```bash
npm run build
npm start
```

## Supabase configuration

The contact API route supports the following environment variables:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
```

It also supports existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` values for compatibility. Never commit secret or service-role keys.

The expected table is `public.portfolio_contacts` with `name`, `email`, `message`, and `created_at` fields. Row Level Security should permit validated `INSERT` operations for the public contact form while preventing public reads.

## Deployment

The repository is connected to Vercel. Pushes to non-production branches should create preview deployments, while the production branch remains `main`.
