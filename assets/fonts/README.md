# Vendored fonts

Latin-subset `woff2` files, pulled once from Google Fonts and committed so the
build never depends on `fonts.gstatic.com`.

`next/font/google` fetches every declared family at **build** time, and one
failed request fails the whole build. With six families across three versions
that turned into a regular CI failure, so `app/layout.jsx` uses
`next/font/local` against these files instead. The build is now hermetic — it
runs with no network at all.

| Family | Weights | Used by |
| --- | --- | --- |
| Inter | 400, 500, 600, 700 | V2, V3 |
| Manrope | 500, 600, 700, 800 | V2 |
| Anton | 400 | V1 (display) |
| Chakra Petch | 500, 600, 700 | V1 (headings) |
| JetBrains Mono | 400, 600, 800 | V1 (mono), V3 (dated lists) |
| Space Grotesk | 400, 500, 600, 700 | V1 (body) |

All six are licensed under the [SIL Open Font License 1.1](https://openfontlicense.org),
which permits redistribution as part of a larger work.

## Refreshing or adding a weight

Request the family from the Google Fonts CSS API with a browser user agent (the
API serves `woff2` only to agents it believes support it), take the URL from the
`latin` block, and save it as `<family-slug>-<weight>.woff2`:

```bash
curl -sSL -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36" \
  "https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap"
```

Then add the file to the matching `src` array in `app/layout.jsx`. Those arrays
have to stay written out longhand — `next/font` rejects any option value that
is not an explicitly written literal, so no helper may build them.
