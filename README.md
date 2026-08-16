# Gaurav Suryavanshi — Portfolio

A single-page personal site for an SDET who also builds API tooling and LLM
applications. One narrow column of prose: the résumé is written as sentences,
and the facts inside them are inline chips you can hover for the detail, rather
than being lifted out into cards.

## What's on it

- A short intro, then a bulleted **Summary** where each fact is an inline chip
  with a small mark and a hover tooltip
- Live Pune time, and the current temperature from Open-Meteo (no API key). If
  the request is slow or fails, the temperature is simply omitted
- **Projects** and **Timeline** as plain dated lists
- An interactive **"How an LLM actually works"** lab, opened from the icon row
- Light by default, with a `prefers-color-scheme` dark variant
- Full `prefers-reduced-motion` support

## Structure

```
app/
  layout.jsx    fonts + metadata; imports no stylesheet
  page.jsx      the page
  site.css      the whole design system
  api/contact/  Supabase-backed contact endpoint (see note below)
components/
  Portfolio.jsx      the page content
  LLMWhiteboard.jsx  the LLM lab
assets/fonts/   self-hosted woff2 — see that folder's README
```

Fonts are self-hosted via `next/font/local` rather than `next/font/google`,
which fetches from `fonts.gstatic.com` at build time and fails the build if a
request does not land. The build makes no network requests.

## Adding a profile photo

The intro currently shows a `GS` monogram. To use a real photo, drop it in
`public/` and swap the `<span className="avatar">` in `components/Portfolio.jsx`
for an image of the same size:

```jsx
<img className="avatar" src="/gaurav.jpg" alt="Gaurav Suryavanshi" width={104} height={104} />
```

The `.avatar` rule already sets `object-fit: cover`, so any aspect ratio crops
cleanly.

## Contact endpoint

`app/api/contact/route.js` still works but nothing on the page posts to it — the
contact form was dropped when the page was simplified down to an email link. It
is kept so a form can be re-added without rebuilding the backend. Delete it if
you would rather not carry it.

It expects a `public.portfolio_contacts` table with `name`, `email`, `message`,
and `created_at`, and reads:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` also work. Row
Level Security should allow validated `INSERT` and no public reads. Never commit
secret or service-role keys.

## Stack

Next.js 15, React 19, Supabase, deployed on Vercel.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev      # http://localhost:3000
```

```bash
npm run build && npm start
```
