# Gaurav Suryavanshi Portfolio

A production-focused Next.js portfolio for an SDET and API-automation engineer who also builds LLM applications and developer tooling.

## What this version includes

- Calm, focused motion: a scroll-progress rail, subtle scroll reveals, and a light 3D tilt on cards — nothing that competes with the content
- Monochrome design system (Manrope + Inter, large-radius cards, hairline borders, no color accents) with a Light and Dark theme
- Terminal-style status line and count-up metrics
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
