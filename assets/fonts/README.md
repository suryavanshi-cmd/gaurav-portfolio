# Vendored fonts

Latin-subset `woff2` files, pulled once from Google Fonts and committed so the
build never depends on `fonts.gstatic.com`. `next/font/google` fetches at
**build** time and one failed request fails the whole build; `app/layout.jsx`
uses `next/font/local` against these files instead, so the build runs with no
network at all.

| File | Family | Declared weights | Used for |
| --- | --- | --- | --- |
| `inter-var.woff2` | Inter (variable) | 400–700 | All text |
| `jetbrains-mono-var.woff2` | JetBrains Mono (variable) | 400–800 | Code, keys, numbers |

Each is a **variable** font: one file carries every weight. The folder used to
hold the same Inter file four times under `inter-400` … `inter-700` (identical
bytes, and the build already resolved them all to one URL), plus families for
two retired designs. Declaring one file with a weight range is what the browser
was effectively doing anyway.

Both are licensed under the [SIL Open Font License 1.1](https://openfontlicense.org),
which permits redistribution as part of a larger work.

## Refreshing

Request the family with a weight *range* from the Google Fonts CSS API, using a
browser user agent (it only serves `woff2` to agents it believes support it),
and take the URL from the `latin` block:

```bash
curl -sSL -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36" \
  "https://fonts.googleapis.com/css2?family=Inter:wght@400..700&display=swap"
```

`next/font` rejects any option that is not a written-out literal, so the
`localFont` calls in `app/layout.jsx` stay longhand.
