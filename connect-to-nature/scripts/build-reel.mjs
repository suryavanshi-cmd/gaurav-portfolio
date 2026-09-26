#!/usr/bin/env node
/* The moving picture behind the front page.
 *
 * There is no openly-licensed film of the Konkan farm coast worth putting
 * behind a headline — what exists on Commons is phone footage of resort decks —
 * so this builds the motion instead: a very slow drift across six photographs
 * of the places the site actually sends people to, dissolving one into the
 * next. It is honest about what it is (the credits name every frame), it
 * weighs a fraction of real footage because almost nothing changes between
 * frames, and it never buffers mid-scroll.
 *
 *   FFMPEG=/path/to/ffmpeg node scripts/build-reel.mjs
 *
 * Output (committed, so no one needs ffmpeg to build the site):
 *   public/reel/konkan.mp4   H.264, for Safari and everything else
 *   public/reel/konkan.webm  VP9, smaller, for browsers that take it
 *   public/reel/poster.avif  first frame, what you see before the file loads
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'reel');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

/* 1280x720 is plenty: the reel sits behind a scrim and a headline, never at
   full contrast, and doubling the pixels would quadruple the bytes for
   something nobody looks at directly. */
const W = 1280;
const H = 720;
const FPS = 25;
const HOLD = 5.6;   // seconds each photograph is the one you are looking at
const FADE = 1.4;   // seconds of dissolve between two of them
const ZOOM = 1.09;  // how far in the drift travels: any more reads as a push

const run = (args) => execFileSync(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'] });

const manifest = JSON.parse(readFileSync(join(ROOT, 'scripts', 'media-manifest.json'), 'utf8'));
const byId = Object.fromEntries(manifest.images.map((i) => [i.id, i]));
const ids = manifest.assign.reel;

const work = join(tmpdir(), `ctn-reel-${process.pid}`);
mkdirSync(work, { recursive: true });
mkdirSync(OUT, { recursive: true });

/* Each photograph is first flattened to one oversized frame. zoompan works on
   whole source pixels, so it stairsteps visibly unless it is given far more
   resolution than it needs and the result is scaled back down. */
const SUPER = 4;
const stills = [];
for (const [i, id] of ids.entries()) {
  const entry = byId[id];
  if (!entry) throw new Error(`reel names "${id}", which the manifest does not define`);
  const cache = join(ROOT, '.media-cache', `${createHash('sha1').update(entry.file).digest('hex')}.bin`);
  if (!existsSync(cache)) throw new Error(`no cached pixels for ${id} — run scripts/fetch-media.mjs first`);
  const still = join(work, `${String(i).padStart(2, '0')}.png`);
  await sharp(readFileSync(cache), { failOn: 'none' })
    .rotate()
    .resize(Math.round(W * SUPER), Math.round(H * SUPER), { fit: 'cover', position: sharp.strategy.attention })
    .png({ compressionLevel: 1 })
    .toFile(still);
  stills.push(still);
  console.log(`still  ${id}`);
}

/* Alternate the direction of travel so the reel breathes instead of marching:
   in, out, in, out. A zoom that only ever tightens feels like a countdown. */
const frames = Math.round(HOLD * FPS);
const clips = stills.map((still, i) => {
  const out = join(work, `clip${i}.mp4`);
  const zIn = `min(1+(${ZOOM - 1})*on/${frames},${ZOOM})`;
  const zOut = `max(${ZOOM}-(${ZOOM - 1})*on/${frames},1)`;
  const z = i % 2 === 0 ? zIn : zOut;
  /* Keep the centre of the pan a touch off-centre and moving, so the frame
     slides as well as scales. */
  const drift = i % 2 === 0 ? '+on/2000' : '-on/2000';
  /* One input frame, expanded by zoompan into `frames` output frames. Feeding
     it a looped input instead makes it expand every frame it is handed, which
     is how you accidentally render two hundred times the footage you asked
     for and wait two minutes a clip for it. */
  run([
    '-loglevel', 'error', '-sws_flags', 'bilinear', '-y', '-i', still,
    '-vf', [
      `zoompan=z='${z}':x='iw/2-(iw/zoom/2)${drift}*iw/100':y='ih/2-(ih/zoom/2)':d=${frames}:s=${W}x${H}:fps=${FPS}`,
      'format=yuv420p',
    ].join(','),
    '-c:v', 'libx264', '-preset', 'veryslow', '-crf', '20', '-an', out,
  ]);
  console.log(`clip   ${ids[i]}`);
  return out;
});

/* Dissolve each into the next — and then the last one back into the first,
   which is why the first clip is fed in twice. The reel is cut at the exact
   moment that second dissolve completes, so the last frame is the frame the
   loop restarts on and the seam is not there at all. Fading down to black
   instead would cost less and be visible every twenty-six seconds. */
const order = [...clips, clips[0]];
const inputs = order.flatMap((c) => ['-i', c]);
const steps = [];
let prev = '0:v';
let offset = HOLD - FADE;
for (let i = 1; i < order.length; i += 1) {
  const label = `x${i}`;
  steps.push(`[${prev}][${i}:v]xfade=transition=fade:duration=${FADE}:offset=${offset.toFixed(3)}[${label}]`);
  prev = label;
  offset += HOLD - FADE;
}
/* offset now sits one hold past the final dissolve; the loop point is where
   that dissolve ended, which is a whole hold earlier. */
const loopAt = offset - (HOLD - FADE) + FADE;
steps.push(`[${prev}]trim=0:${loopAt.toFixed(3)},setpts=PTS-STARTPTS[v]`);

const master = join(work, 'master.mp4');
run([
  '-loglevel', 'error', '-y', ...inputs,
  '-filter_complex', steps.join(';'), '-map', '[v]',
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-an', master,
]);
console.log('reel   assembled');

/* Two deliveries of the same thing. The slow pans mean almost every frame is
   the last one nudged sideways, which is exactly what these codecs are good
   at, so the bitrate cap does most of the work. */
run([
  '-loglevel', 'error', '-y', '-i', master,
  '-c:v', 'libx264', '-profile:v', 'main', '-preset', 'slow',
  '-crf', '33', '-maxrate', '700k', '-bufsize', '2000k',
  '-pix_fmt', 'yuv420p', '-g', String(FPS * 5), '-an',
  '-movflags', '+faststart', join(OUT, 'konkan.mp4'),
]);
run([
  '-loglevel', 'error', '-y', '-i', master,
  '-c:v', 'libvpx-vp9', '-crf', '50', '-b:v', '0', '-row-mt', '1',
  '-deadline', 'good', '-cpu-used', '2', '-pix_fmt', 'yuv420p', '-an',
  join(OUT, 'konkan.webm'),
]);

/* The poster is what almost every visitor actually sees. It is frame zero of
   the reel exactly, so when the video does arrive and start playing there is
   nothing to notice. */
const posterPng = join(work, 'poster.png');
run(['-loglevel', 'error', '-y', '-i', master, '-frames:v', '1', posterPng]);
const poster = sharp(posterPng);
await poster.clone().avif({ quality: 55, effort: 4 }).toFile(join(OUT, 'poster.avif'));
await poster.clone().jpeg({ quality: 70, mozjpeg: true, progressive: true }).toFile(join(OUT, 'poster.jpg'));
const blur = await sharp(posterPng).resize(24, 14, { fit: 'cover' }).webp({ quality: 30 }).toBuffer();

writeFileSync(join(ROOT, 'src', 'lib', 'reel.ts'), `/* Generated by scripts/build-reel.mjs — do not edit by hand. */

/** The photographs the front-page reel drifts across, in the order it shows them. */
export const REEL_FRAMES: readonly string[] = ${JSON.stringify(ids)};

/** Inlined 24px still, painted under the poster so the hero is never empty. */
export const REEL_BLUR = ${JSON.stringify(`data:image/webp;base64,${blur.toString('base64')}`)};

/** Seconds. Used to decide when the loop can be released from memory. */
export const REEL_SECONDS = ${loopAt.toFixed(1)};
`);

rmSync(work, { recursive: true, force: true });
for (const f of ['konkan.mp4', 'konkan.webm', 'poster.avif', 'poster.jpg']) {
  console.log(`${f.padEnd(14)} ${(readFileSync(join(OUT, f)).length / 1024).toFixed(0)} KB`);
}
