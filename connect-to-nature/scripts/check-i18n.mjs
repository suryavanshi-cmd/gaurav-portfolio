/* Every locale must carry every key.
 *
 * A missing key does not crash — translate() falls back to English — which is
 * exactly why it needs a test: an untranslated string would otherwise sit in
 * the Marathi build unnoticed for months.
 */

import en from '../src/i18n/messages/en.json' with { type: 'json' };
import hi from '../src/i18n/messages/hi.json' with { type: 'json' };
import mr from '../src/i18n/messages/mr.json' with { type: 'json' };

const flatten = (object, prefix = '') =>
  Object.entries(object).flatMap(([key, value]) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? flatten(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );

const reference = flatten(en);
const problems = [];

for (const [code, dictionary] of Object.entries({ hi, mr })) {
  const keys = flatten(dictionary);
  const missing = reference.filter((key) => !keys.includes(key));
  const extra = keys.filter((key) => !reference.includes(key));
  if (missing.length) problems.push(`${code}: missing ${missing.length} — ${missing.slice(0, 8).join(', ')}`);
  if (extra.length) problems.push(`${code}: unknown ${extra.length} — ${extra.slice(0, 8).join(', ')}`);
}

// The empty string is the other way a translation goes missing.
for (const [code, dictionary] of Object.entries({ en, hi, mr })) {
  const blanks = flatten(dictionary).filter((key) => {
    const value = key.split('.').reduce((acc, part) => acc?.[part], dictionary);
    return typeof value === 'string' && value.trim() === '';
  });
  if (blanks.length) problems.push(`${code}: blank ${blanks.length} — ${blanks.slice(0, 8).join(', ')}`);
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

console.log(`i18n: ${reference.length} keys × 3 locales, all present.`);
