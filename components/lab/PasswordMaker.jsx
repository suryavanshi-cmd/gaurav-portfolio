'use client';

import { useCallback, useEffect, useState } from 'react';
import { Slider, Switch } from './controls';
import { Segmented } from '../ui';

/*
  Strong passwords and easy-to-type passphrases, made in this browser with
  crypto.getRandomValues — never sent anywhere.

  Strength is measured the honest way: how many equally likely choices the
  generator had (bits of entropy), then how long guessing through half of
  them would take at ten billion guesses a second — a fast offline attack.
*/

const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const LOOKALIKE = { lower: 'l', upper: 'IO', digits: '01' };
const SYMBOLS = '!@#$%^&*-_=+?';

const WORDS = `apple river mango tiger cloud stone paper light green happy music ocean
chair bread horse lemon candle garden rocket silver window yellow forest planet
button coffee dragon engine family guitar island jacket kitten ladder marble
needle orange pencil puzzle rabbit saddle tomato turtle valley wallet zebra
anchor basket butter camera circle cotton desert doctor eagle falcon feather
flower ginger hammer helmet honey jungle kettle lizard magnet meadow mirror
monkey nectar noodle oyster parrot peanut pepper pillow pocket potato prince
quiet radio raven ribbon saffron sailor salmon shadow spider spring summer
sunset tablet teapot thunder ticket timber tunnel velvet violet walnut water
winter wizard yogurt bamboo banana beacon bicycle blanket bottle bridge bubble
cactus canvas carrot castle cherry cinema clover comet copper crystal cupcake
daisy dolphin donkey drum elbow ember fabric fiddle finger flame frost galaxy
garlic glacier goose grape harbor hazel hiking igloo indigo jasmine jelly
kayak koala lantern lava lotus lunar maple melon mint moss nest nickel nutmeg
olive orbit otter panda papaya pebble penguin piano pickle pine pixel plum
pond poppy pretzel pumpkin quartz quill raisin rain reef rhythm robin rose
ruby saga sand scarf season shell shore silk sky snow sofa spice spoon star
storm sugar swan syrup tea thread tide toast topaz tower train tulip unicorn
vanilla vase wave whale willow wind wolf wool yarn zinc zone amber arrow
atlas bell berry blaze bloom brook cabin cedar chalk clay coral crane creek
dawn delta dune echo fern field flint fog gem glow grove gust hill ivy jade
kite lake leaf lily loom marsh mist moon`.split(/\s+/);

function randomInt(n) {
  const max = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  do { crypto.getRandomValues(buf); } while (buf[0] >= max);
  return buf[0] % n;
}

function makePassword(length, opts) {
  const sets = [LOWER + (opts.similar ? '' : LOOKALIKE.lower)];
  if (opts.upper) sets.push(opts.similar ? UPPER : UPPER + LOOKALIKE.upper);
  if (opts.digits) sets.push(opts.similar ? DIGITS : DIGITS + LOOKALIKE.digits);
  if (opts.symbols) sets.push(SYMBOLS);
  const all = sets.join('');
  /* One from each chosen set, the rest from all, then shuffle. */
  const chars = sets.map((s) => s[randomInt(s.length)]);
  while (chars.length < length) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return { value: chars.join(''), bits: length * Math.log2(all.length) };
}

function makePhrase(count, opts) {
  const words = Array.from({ length: count }, () => WORDS[randomInt(WORDS.length)]);
  const shown = opts.upper ? words.map((w) => w[0].toUpperCase() + w.slice(1)) : words;
  let value = shown.join(opts.sep);
  let bits = count * Math.log2(WORDS.length);
  if (opts.digits) {
    value += opts.sep + (10 + randomInt(90));
    bits += Math.log2(90);
  }
  return { value, bits };
}

function crackTime(bits) {
  const seconds = 2 ** (bits - 1) / 1e10;
  const units = [
    ['seconds', 60], ['minutes', 60], ['hours', 24], ['days', 365], ['years', 1000], ['thousand years', 1000], ['million years', 1000], ['billion years', Infinity],
  ];
  let v = seconds;
  for (const [name, step] of units) {
    if (v < step) return v < 1 && name === 'seconds' ? 'under a second' : `about ${Math.max(1, Math.round(v)).toLocaleString('en-US')} ${name}`;
    v /= step;
  }
  return 'longer than the universe has existed';
}

function grade(bits) {
  if (bits < 40) return { label: 'Weak', tone: 'bad', pct: 20 };
  if (bits < 60) return { label: 'Okay', tone: 'warn', pct: 45 };
  if (bits < 80) return { label: 'Strong', tone: 'ok', pct: 75 };
  return { label: 'Very strong', tone: 'ok', pct: 100 };
}

export default function PasswordMaker() {
  const [mode, setMode] = useState('password');
  const [length, setLength] = useState(16);
  const [count, setCount] = useState(7);
  const [upper, setUpper] = useState(true);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [similar, setSimilar] = useState(true);
  const [result, setResult] = useState({ value: '', bits: 0 });
  const [copied, setCopied] = useState(false);
  const [spin, setSpin] = useState(0);

  const make = useCallback(() => {
    setResult(mode === 'password'
      ? makePassword(length, { upper, digits, symbols, similar })
      : makePhrase(count, { upper, digits, sep: '-' }));
    setSpin((n) => n + 1);
    setCopied(false);
  }, [mode, length, count, upper, digits, symbols, similar]);

  useEffect(() => { make(); }, [make]);

  const copy = () => {
    navigator.clipboard?.writeText(result.value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }).catch(() => {});
  };

  const g = grade(result.bits);

  return (
    <div className="tool">
      <div className="tool-stage pw-stage">
        <Segmented
          label="Kind"
          value={mode}
          onChange={setMode}
          options={[{ value: 'password', label: 'Password' }, { value: 'phrase', label: 'Easy-to-type phrase' }]}
        />
        <output className="pw-out" key={spin} aria-live="polite">{result.value}</output>
        <div className="pw-meter" aria-hidden="true"><i className={`is-${g.tone}`} style={{ width: `${g.pct}%` }} /></div>
        <p className="pw-grade">
          <b className={`is-${g.tone}`}>{g.label}</b>
          <span>{Math.round(result.bits)} bits · guessing it would take {crackTime(result.bits)}</span>
        </p>
        <div className="pw-actions">
          <button type="button" className="btn btn-primary" onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
          <button type="button" className="btn btn-ghost" onClick={make}>New one ↻</button>
        </div>
      </div>

      <div className="tool-body">
        <div className="tool-controls">
          {mode === 'password'
            ? <Slider label="Length" value={length} min={8} max={40} onChange={setLength} format={(v) => `${v} characters`} />
            : <Slider label="Words" value={count} min={4} max={10} onChange={setCount} format={(v) => `${v} words`} />}
          <Switch label={mode === 'password' ? 'Capital letters' : 'Capitalise words'} checked={upper} onChange={setUpper} />
          <Switch label={mode === 'password' ? 'Numbers' : 'Add a number'} checked={digits} onChange={setDigits} />
          {mode === 'password' ? <Switch label="Symbols" checked={symbols} onChange={setSymbols} /> : null}
          {mode === 'password' ? <Switch label="Skip look-alikes (l, 1, O, 0)" checked={similar} onChange={setSimilar} /> : null}
        </div>
        <p className="verdict is-info">
          <span className="verdict-icon" aria-hidden="true">ℹ︎</span>
          <span><b>Length beats clever tricks.</b> {mode === 'phrase' ? `Each word here adds about 8 bits, so a phrase needs more words than you might think: 7 words and a number are about as strong as 10 random characters — and far easier to type on a phone.` : 'Every extra character multiplies the guesses needed. 16 random characters is plenty for almost anything.'} Use a different one for every site, and a password manager to remember them.</span>
        </p>
        <p className="legend"><span>Made in your browser with a secure random generator. Nothing is sent or saved.</span></p>
      </div>
    </div>
  );
}
