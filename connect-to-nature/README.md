# Connect to Nature

A farm-stay marketplace for the **Kokan** and **Nashik** vibhags of Maharashtra:
farming families list the room, the food and the work guests can join, and
travellers book a ready two-day trip or build their own. Everything reads the
same in **English, हिंदी and मराठी**.

One Next.js deployment serves two portals against one Supabase database:

| | |
| --- | --- |
| `www.…` (or `/`) | **Traveller portal** — discovery, two-day packages, the trip planner, checkout, reviews |
| `shetkari.…` (or `/shetkari`) | **Shetkari portal** — onboarding, listing, availability calendar, bookings, earnings |
| `/admin` | **Admin** — approvals, vibhags, leads, platform numbers. Role-gated, not a third app |

```
npm install
npm run dev        # http://localhost:3000
```

**The database is live.** This repository is wired to a Supabase project in
`ap-south-1` (Mumbai) that already has the schema, the row-level security and
the twelve farms in it — `.env.production` carries the URL and the publishable
key, both of which are public by design. `npm run dev` with no `.env.local` runs
against the seeded rows in `src/lib/seed-content.ts` instead, so the repository
is still clonable and runnable with nothing configured.

With an empty `.env` the app boots in **demo mode**: the twelve seeded farms are
served from memory, every page works, and nothing is written anywhere. Add the
Supabase keys and the same pages read and write the real database.

---

## The problem it solves

A farmer in Pawas has four hundred mango trees, a spare room, and no way to
reach the person in Mumbai who would happily pay to spend two days grafting.
The traveller has no trustworthy place to find them. This is the bridge: the
farm sets its own price, the traveller sees the plan before they pay, and 92%
of the money reaches the family.

## What is built

**Traveller portal**
- Home, with the two vibhags, the featured farms and the ready trips
- **Explore** — search across three languages, filter by vibhag, activity,
  group size and budget, sorted by recommendation, price or rating
- **Farm page** — the family, the crops, every experience they run, what the
  price includes, reviews, and a booking panel that prices itself
- **Two-day packages** — curated stay + meals + activities, hour by hour
- **Trip planner** — four questions, a matched farm, a two-day itinerary built
  from what that farm actually runs at those hours, a cost breakdown that shows
  the farmer's share, and two alternatives you can swap to (which re-plans)
- **Checkout** — Razorpay order, signature verified server-side; without keys
  the booking completes and is marked `demo`
- **My trips** — upcoming and past stays, and a review form that only opens on a
  stay that finished

**Shetkari portal** (Marathi by default, larger type, bigger tap targets)
- A short lead form: a name and a number, nothing else required
- Five-step onboarding: farm → rooms and photos → what guests can join → price
  and calendar → payout
- Dashboard: bookings with the guest's phone as a tap-to-call link, earnings
  (this month, all time, owed), a 60-day availability calendar, the live page

**Admin**
- Farms waiting for approval, approved or rejected with one tap — publishing is
  a service-role write behind a role check
- The vibhag list, the farmers who left a number, and the platform totals

## Architecture

### One deployment, two portals

`src/middleware.ts` reads the `Host` header. `shetkari.<domain>` is rewritten
onto `/shetkari`, and a header tells the rest of the app which portal it is
serving. Both portals share one build, one database and one session cookie — a
farmer signed in on the subdomain is signed in on the main site.

The `/shetkari` path also works on the root domain, which is what makes the host
portal reachable on `localhost` and on preview URLs where no subdomain exists.

> The brief suggested a Turborepo with two Next.js apps. This is one app with
> two route groups instead: the portals share the design tokens, the Supabase
> client, the i18n dictionary and every type, so a monorepo would have moved
> most of the code into `packages/` and left two thin shells. Splitting later is
> a mechanical change; the seam — `src/app/(customer)` and `src/app/shetkari` —
> is already there.

### Three languages, switched without a reload

- Every string lives in `src/i18n/messages/{en,hi,mr}.json` — 329 keys each,
  and CI fails if one dictionary drifts from another (`npm run check:i18n`)
- Content out of the database (farm titles, host bios, activities, itinerary
  items) is `jsonb` of the shape `{"en": …, "hi": …, "mr": …}`, so a fourth
  language is a data change, not a migration
- All three dictionaries ship to the browser (~40 kB). Switching language
  re-renders from memory: no navigation, no reload, no lost form state
- The switcher writes a cookie, so the *next* server render — and the metadata,
  and `<html lang>` — start in the same language. No flash of English
- The shetkari portal opens in Marathi unless the visitor has chosen otherwise

### The database

`supabase/migrations` is the source of truth: 15 tables, 7 enums, the triggers,
the row-level security and the grants.

| Table | What it holds |
| --- | --- |
| `profiles` | one row per account, with `role` = traveler / host / admin |
| `regions` | the vibhags — **admin adds one by inserting a row**, no code change |
| `activities` | the catalogue, each with the slots of the day it suits |
| `host_profiles`, `listings`, `listing_photos`, `listing_activities` | the farms |
| `availability` | one row per date a host has opened |
| `trip_packages`, `custom_itineraries` | curated trips, and planner results |
| `bookings`, `payouts`, `reviews`, `wishlists` | the transaction and after it |
| `host_leads` | a farmer's number, left before they have an account |

Triggers do the things that must not depend on the application getting it
right: a profile for every new `auth.users` row, a readable booking code
(`CTN-7K2M4Q`), the 92/8 split stored on the row, a payout scheduled when a
booking is confirmed, and a listing's rating recomputed from its reviews.

**Row-level security is the access model**, not a formality. Both portals talk
to PostgREST with the anon key and the user's JWT:

- a farm page is public; a booking is visible to the traveller who made it, the
  host of that farm, and an admin
- a review can only be written against your own booking that *completed* — the
  policy will not accept one otherwise, which is what "verified review" means
- the grants are reset and re-issued explicitly, so an anonymous visitor cannot
  even name `bookings`, `profiles` or `host_leads`
- the service-role key is used in exactly two places on the server (admin
  approvals, payment verification) and never reaches the browser

### Prices are computed on the server

The browser sends which farm, which dates and how many people. Never the price.
`/api/bookings` looks the listing up, recomputes the total and the split, checks
`listing_is_available()` in the database, and only then inserts.

## Running it

```bash
cp .env.example .env.local     # optional — without it, demo mode
npm install
npm run dev
```

| Command | |
| --- | --- |
| `npm run dev` | the app on :3000 |
| `npm run build` | production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run check:i18n` | every locale carries every key, none blank |
| `npm run check:sql` | migrations + seed + assertions + RLS against a real PostgreSQL |
| `npm run seed:generate` | rewrite `supabase/seed.sql` from `src/lib/seed-content.ts` |

### The live project

Already applied to `rzwzaytodauobtrmsfei` (Mumbai): all five migrations, the
seed (2 vibhags, 37 activities, 12 farms, 4 packages, 8 reviews, 2,172 open
dates), and the storage bucket. Verified against it as an anonymous visitor:
farms and reviews readable, `bookings` / `profiles` / `host_leads` / `payouts`
not readable at all, and a booking insert refused.

Two things are deliberately still off, because their secrets do not belong in a
repository — set them on the host to switch them on:

| Environment variable | What it enables |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | admin approvals publishing a farm |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | real payments instead of `demo` bookings |

Make yourself an admin once you have signed in:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Phone sign-in needs an SMS provider connected under **Auth → Providers**; email
OTP works out of the box.

### Connecting a different Supabase project

1. Create a project at [supabase.com](https://supabase.com) and copy the URL and
   the anon key from **Settings → API** into `.env.local`.
2. Apply the schema:
   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
   Then run `supabase/seed.sql` from the SQL editor (or `supabase db reset`
   locally) if you want the twelve demonstration farms.
3. **Auth → Providers**: turn on phone sign-in and connect an SMS provider. This
   matters more than email — a farmer answers a phone.
4. **Storage**: the `listing-photos` bucket is created by the migration.
5. Make yourself an admin:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```

Absent keys are not an error anywhere: no Supabase → demo mode; no Razorpay →
the booking completes and is marked `demo`. The banner at the top of the page
says which mode you are in.

### Deploying

**Deployed at** <https://connect-to-nature.vercel.app> — public; the
deployment-specific `*-<hash>.vercel.app` URLs are behind Vercel Authentication,
which is the default for a new project and applies to them, not to the
production domain.

That deployment is a **bootstrap**: the Vercel Git integration could not be
authorised for this account, so the project was created by uploading a manifest
whose install step fetches this directory from a pinned commit. It is a real
build of real code, but **it does not redeploy when the repository changes.**

To replace it with a linked project — which is what you want:

1. In Vercel, **Add New → Project**, pick `suryavanshi-cmd/gaurav-portfolio`,
   and set **Root Directory** to `connect-to-nature`. No environment variables
   are needed for the first deploy; `.env.production` already points at the
   database. Add `SUPABASE_SERVICE_ROLE_KEY` and the Razorpay pair when you want
   approvals and real payments.
2. Delete the bootstrap `connect-to-nature` project (and the throwaway
   `ctn-scope-check` one) once the linked project is deploying.

`vercel.json` here sets `ignoreCommand`, because this is one directory of a
repository that also holds the portfolio site and rakta-setu: without it, every
commit to either of those would rebuild and redeploy this project. The command
exits 0 — skip — when the last commit touched nothing in this directory, and
Vercel builds if the command itself fails, which is the safe direction.

For the two portals, point both `www.<domain>` and `shetkari.<domain>` at the
same project; the middleware does the rest. On a `*.vercel.app` URL there is no
subdomain to use, so the farmer portal lives at `/shetkari` there.

**GitHub Actions** (`.github/workflows/connect-to-nature.yml`) typechecks and
builds the app, applies every migration and the seed to a PostgreSQL service
container and runs the assertions, then — on `main`, and only if
`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID` and `SUPABASE_DB_PASSWORD` are
set — runs `supabase db push` against the project.

## The seed content

`src/lib/seed-content.ts` is the one place the twelve farms, thirty-seven
activities, four packages and eight reviews are written. It is read twice: by
`scripts/generate-seed.mjs`, which writes `supabase/seed.sql`, and by
`src/lib/demo-data.ts`, which serves the same rows when no project is
configured — so the demo and a freshly reset database show exactly the same
thing. CI fails if the generated SQL is out of date.

Farms with no photographs get a drawing generated from their own slug and
landscape (`src/components/Scene.tsx`) rather than a grey box or a stock photo
of somebody else's farm. It is replaced the moment a host uploads a real one.

**The farms, hosts and reviews are written for this build.** The database, the
policies, the planner, the payment flow and the three languages are real.

## Design

System font stack (SF on Apple devices, with a Devanagari fallback that gets its
own line-height, or Marathi headings clip their matras), a hairline-and-shadow
card, 20–28px radii, and one easing curve — `cubic-bezier(0.22, 1, 0.36, 1)` —
on everything that moves. Scroll-triggered reveals, a sliding indicator on every
segmented control, a parallax hero, sheets that spring up from the bottom on a
phone. Light and dark are both explicit, resolved before first paint so nothing
flashes, and `prefers-reduced-motion` turns all of it off.

## Not built

Phase 3 of the brief, and stated plainly rather than half-done: in-app messaging
between host and traveller, dynamic pricing, a loyalty programme, and an
embedded map (the farm page links out to coordinates rather than pulling in a
maps SDK and a key). Photo upload writes to Supabase Storage but there is no
cropping or re-ordering UI yet.
