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

## Light and dark

A three-way control in the header: **light**, **dark**, **system**. System is a
real option, not a gap — without it, a visitor who just wants to follow their OS
has no way back once they have touched the control, and on a phone that also
means losing the automatic switch at sunset.

The stylesheet reads one attribute on `<html>`:

| `data-theme` | Result |
| --- | --- |
| *absent* | follow the OS — the media query decides |
| `light` | force light, even on a dark OS |
| `dark` | force dark, even on a light OS |

The dark palette is therefore declared twice: once under
`@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme='light'])`,
so an explicit light choice still wins on a dark OS, and once under
`:root[data-theme='dark']` for the explicit choice. Neither is the default, so
the light values stand until one matches.

The control's active option is marked by a single indicator that slides between
the three, driven by a `--i` custom property — one transform on one element
rather than three backgrounds crossfading. It carries two flags: `is-ready`
reveals it once the stored choice is known, and `is-armed`, set only by a click,
is what permits it to travel. Without that split both would change in the same
React commit and the indicator would slide across on every page load.

A stored choice is applied by the inline script in `app/layout.jsx`, before
first paint. That has to be synchronous and inline — applying it in an effect
paints the system theme first and flashes on every load. With no stored choice
the attribute stays off and the media query does the work, so a blocked script
degrades to exactly the OS-following behaviour.

## Writing

Posts live in `components/posts.js` (LLM topics) and
`components/engineeringPosts.js`. Bodies are block arrays, rendered by
`app/blog/[slug]/page.jsx`, which prerenders every post at build time.

On the homepage a post title does not navigate. It opens a summary panel
underneath — the summary, the tags, and a "Read more" link — so a reader can
see what a post is about before committing to it. The panel animates
`grid-template-rows` from `0fr` to `1fr`, which eases open at the content's own
height without measuring anything in JS, and is `inert` while closed so it stays
out of the tab order.

Getting back is handled by `components/BackToList.jsx`. A plain
`<Link href="/#interests">` pushes a *new* history entry and lands on the
section heading, so the reader ends up somewhere other than where they left.
When they actually came from the list, the control calls `router.back()`
instead, which unwinds that entry and lets the router restore the scroll
position exactly. "Came from the list" is a single-use `sessionStorage` token
set by "Read more" and consumed on mount, so a deep link, a refresh, or an
arrival from search finds nothing and gets the ordinary link — which is also
what renders on the server, keeping hydration stable.

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
