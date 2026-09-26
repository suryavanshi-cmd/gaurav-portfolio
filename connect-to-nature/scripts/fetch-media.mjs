#!/usr/bin/env node
/* Turn scripts/media-manifest.json into the pictures the site actually serves.
 *
 * Every photograph is pulled from Wikimedia Commons together with its real
 * photographer, licence and source page, so the credit is read off the file
 * rather than typed next to it. Nothing here runs at build time or at request
 * time: the output is committed, so a page load costs one static file and no
 * image-optimiser round trip.
 *
 *   node scripts/fetch-media.mjs            # encode whatever is missing
 *   node scripts/fetch-media.mjs --force    # re-encode everything
 *
 * Commons asks that tools go through the thumbnailer rather than pulling
 * originals, and rate-limits when they do not, so that is what this does — one
 * request per picture, spaced out, cached in .media-cache/ between runs. */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, '.media-cache');
const OUT = join(ROOT, 'public', 'photos');
const UA = 'ConnectToNature/1.0 (https://github.com/suryavanshi-cmd/gaurav-portfolio)';
const API = 'https://commons.wikimedia.org/w/api.php';
const FORCE = process.argv.includes('--force');

/* Two ladders. A farm card is never painted wider than about 620 CSS pixels, so
   960 covers it on a 2x phone; the full-bleed pictures have to survive a
   desktop hero. */
const WIDTHS = { wide: [640, 1280, 1920], card: [480, 960] };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url) {
  for (let attempt = 0; ; attempt += 1) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return res.json();
    if (attempt >= 4) throw new Error(`${res.status} ${res.statusText} for ${url}`);
    await sleep(4000 * (attempt + 1));
  }
}

async function getBuffer(url) {
  for (let attempt = 0; ; attempt += 1) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (attempt >= 4) throw new Error(`${res.status} for ${url}`);
    await sleep(6000 * (attempt + 1));
  }
}

const text = (html) => (html ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

/* Commons metadata, cached: the credit must not change because a run happened
   on a different day. */
async function describe(file) {
  const key = join(CACHE, `${createHash('sha1').update(file).digest('hex')}.json`);
  if (existsSync(key) && !FORCE) return JSON.parse(readFileSync(key, 'utf8'));
  const url = `${API}?${new URLSearchParams({
    action: 'query', format: 'json', titles: `File:${file}`,
    prop: 'imageinfo', iiprop: 'url|extmetadata|size|mime', iiurlwidth: '2400',
  })}`;
  const data = await getJSON(url);
  const page = Object.values(data.query?.pages ?? {})[0];
  if (!page?.imageinfo) throw new Error(`Commons has no file named "${file}"`);
  const info = page.imageinfo[0];
  const meta = info.extmetadata ?? {};
  const out = {
    file,
    width: info.width, height: info.height,
    thumb: info.thumburl ?? info.url,
    source: info.descriptionurl,
    author: text(meta.Artist?.value) || 'Unknown photographer',
    licence: text(meta.LicenseShortName?.value) || 'see source',
    licenceUrl: meta.LicenseUrl?.value ?? '',
  };
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(key, JSON.stringify(out, null, 1));
  await sleep(1500);
  return out;
}

async function pixels(meta) {
  const key = join(CACHE, `${createHash('sha1').update(meta.file).digest('hex')}.bin`);
  if (existsSync(key) && !FORCE) return readFileSync(key);
  const buf = await getBuffer(meta.thumb);
  writeFileSync(key, buf);
  await sleep(1500);
  return buf;
}

/* 16:10 for cards, 16:9 for anything full-bleed. Attention-based cropping keeps
   the horizon rather than the sky when a photograph is much taller than the
   frame it has to fill. */
const RATIO = { wide: 16 / 9, card: 16 / 10 };

async function encode(image, id, role) {
  const widths = WIDTHS[role];
  const ratio = RATIO[role];
  /* The JPEG exists only for the few per cent of browsers with no AVIF, so it
     is cut at the middle rung rather than the top one: those browsers get a
     photograph that is sharp enough, and everyone else stops carrying the
     weight of a large one they will never request. */
  const fw = widths[Math.min(1, widths.length - 1)];
  const written = [...widths.map((w) => `${id}-${w}.avif`), `${id}-${fw}.jpg`];

  /* Encoding a ladder of AVIFs is the slow part of this script, so a re-run
     only does the files that are not already sitting on disk. */
  if (!FORCE && written.every((f) => existsSync(join(OUT, f)))) return written;

  for (const w of widths) {
    const out = join(OUT, `${id}-${w}.avif`);
    if (!FORCE && existsSync(out)) continue;
    await sharp(image, { failOn: 'none' })
      .rotate()
      .resize(w, Math.round(w / ratio), { fit: 'cover', position: sharp.strategy.attention })
      .avif({ quality: w > 1000 ? 48 : 52, effort: 4 })
      .toFile(out);
  }
  /* One JPEG so a browser without AVIF still gets a photograph. */
  const jpg = join(OUT, `${id}-${fw}.jpg`);
  if (FORCE || !existsSync(jpg)) {
    await sharp(image, { failOn: 'none' })
      .rotate()
      .resize(fw, Math.round(fw / ratio), { fit: 'cover', position: sharp.strategy.attention })
      .jpeg({ quality: 74, mozjpeg: true, progressive: true })
      .toFile(jpg);
  }
  return written;
}

/* A tiny blurred placeholder, inlined into the markup, so a card has something
   of the right colour in it before the photograph lands. */
async function blurDataUrl(image) {
  const buf = await sharp(image, { failOn: 'none' }).rotate().resize(20, 13, { fit: 'cover' })
    .webp({ quality: 28, alphaQuality: 0 }).toBuffer();
  return `data:image/webp;base64,${buf.toString('base64')}`;
}

const manifest = JSON.parse(readFileSync(join(ROOT, 'scripts', 'media-manifest.json'), 'utf8'));
mkdirSync(OUT, { recursive: true });
mkdirSync(CACHE, { recursive: true });

if (FORCE) for (const f of readdirSync(OUT)) rmSync(join(OUT, f));

const records = [];
for (const entry of manifest.images) {
  const meta = await describe(entry.file);
  const buf = await pixels(meta);
  const files = await encode(buf, entry.id, entry.role);
  const blur = await blurDataUrl(buf);
  records.push({ ...entry, ...meta, widths: WIDTHS[entry.role], blur });
  const bytes = files.reduce((n, f) => n + readFileSync(join(OUT, f)).length, 0);
  console.log(`${entry.id.padEnd(20)} ${entry.role.padEnd(5)} ${(bytes / 1024).toFixed(0).padStart(5)} KB  ${meta.licence}`);
}

const esc = (s) => JSON.stringify(s ?? '');

const ts = `/* Generated by scripts/fetch-media.mjs — do not edit by hand.
 *
 * Every photograph on this site is a real photograph of a real place, reused
 * from Wikimedia Commons under the licence recorded beside it. \`where\` is the
 * place in the frame, which is not always the village of the farm the picture
 * illustrates: the demo farms are invented, their landscapes are not, and the
 * credit under each picture says so rather than letting the page imply
 * otherwise. Run \`npm run media:fetch\` to regenerate. */

import type { I18nJson } from './types';

export interface Photo {
  id: string;
  /** Widest encoded file; also the <img src> for browsers without srcset. */
  src: string;
  /** AVIF ladder, newest format first, for the <source> element. */
  avif: string;
  /** 20px WebP, inlined, shown until the real file decodes. */
  blur: string;
  width: number;
  height: number;
  alt: I18nJson;
  where: I18nJson;
  author: string;
  licence: string;
  licenceUrl: string;
  source: string;
}

export const PHOTOS: Record<string, Photo> = {
${records.map((r) => {
  const ratio = r.role === 'wide' ? 16 / 9 : 16 / 10;
  const w = r.widths[Math.min(1, r.widths.length - 1)];
  return `  ${JSON.stringify(r.id)}: {
    id: ${esc(r.id)},
    src: ${esc(`/photos/${r.id}-${w}.jpg`)},
    avif: ${esc(r.widths.map((x) => `/photos/${r.id}-${x}.avif ${x}w`).join(', '))},
    blur: ${esc(r.blur)},
    width: ${w}, height: ${Math.round(w / ratio)},
    alt: ${JSON.stringify(r.alt)},
    where: ${JSON.stringify(r.where)},
    author: ${esc(r.author)},
    licence: ${esc(r.licence)},
    licenceUrl: ${esc(r.licenceUrl)},
    source: ${esc(r.source)},
  },`;
}).join('\n')}
};

/** Which photographs illustrate which farm, region and package. */
export const PHOTO_SETS = {
  regions: ${JSON.stringify(manifest.assign.regions, null, 2).replace(/\n/g, '\n  ')},
  farms: ${JSON.stringify(manifest.assign.farms, null, 2).replace(/\n/g, '\n  ')},
  packages: ${JSON.stringify(manifest.assign.packages, null, 2).replace(/\n/g, '\n  ')},
} as const;

/** The stills the front-page reel drifts across, in order. */
export const REEL: readonly string[] = ${JSON.stringify(manifest.assign.reel)};

export function photosFor(kind: 'regions' | 'farms' | 'packages', slug: string): Photo[] {
  const ids = (PHOTO_SETS[kind] as Record<string, readonly string[]>)[slug] ?? [];
  return ids.map((id) => PHOTOS[id]).filter(Boolean);
}
`;

writeFileSync(join(ROOT, 'src', 'lib', 'photo-credits.ts'), ts);

const total = readdirSync(OUT).reduce((n, f) => n + readFileSync(join(OUT, f)).length, 0);
console.log(`\n${records.length} photographs, ${readdirSync(OUT).length} files, ${(total / 1048576).toFixed(1)} MB in public/photos`);
console.log('wrote src/lib/photo-credits.ts');
