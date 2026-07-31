# Gaurav Suryavanshi Portfolio

A production-focused Next.js portfolio for a Forward Deployment Engineer, LLM Application Engineer, and automation-focused software engineer.

## What this version includes

- High-energy motion layer: canvas lightning strikes, click sparks, a plasma cursor, scroll-velocity warp lines, and a scroll charge rail
- Display typography system (Anton, Chakra Petch, Space Grotesk, JetBrains Mono) with an animated gradient headline and glitch echo
- Kinetic content: text scramble, terminal typewriter, count-up metrics, high-speed marquee, scroll reveals, 3D tilt and spotlight cards, magnetic buttons
- OVERDRIVE mode — a faster, louder variant of the whole site, toggled from the control in the corner or with the Konami code
- Premium responsive portfolio UI with Dark, Read, Sky, and Night themes
- Three focused project collections:
  - LLM & AI Systems
  - Automation & Delivery
  - Web Server & Data
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
