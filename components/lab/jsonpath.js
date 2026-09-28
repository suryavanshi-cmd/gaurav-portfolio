/*
  A small JSONPath subset — enough for chaining API calls:

    $.a.b          object keys
    $['a b']       quoted keys (spaces, dots, dashes)
    $.list[0]      array index; negative counts from the end
    $.list[*].id   wildcard — every element; the result is a list
    $.obj.*        wildcard over an object's values

  Pure functions, no dependencies, so they are easy to test and reuse.
*/

export function parsePath(path) {
  const src = path.trim();
  if (!src.startsWith('$')) throw new Error('A path must start with $');

  const tokens = [];
  let i = 1;
  while (i < src.length) {
    const ch = src[i];

    if (ch === '.') {
      if (src[i + 1] === '*') {
        tokens.push({ type: 'wild' });
        i += 2;
        continue;
      }
      let j = i + 1;
      while (j < src.length && /[A-Za-z0-9_$-]/.test(src[j])) j += 1;
      if (j === i + 1) throw new Error(`Expected a name after "." at position ${i + 1}`);
      tokens.push({ type: 'key', key: src.slice(i + 1, j) });
      i = j;
      continue;
    }

    if (ch === '[') {
      const end = src.indexOf(']', i);
      if (end === -1) throw new Error('Missing a closing ]');
      const inner = src.slice(i + 1, end).trim();
      if (inner === '*') tokens.push({ type: 'wild' });
      else if (/^-?\d+$/.test(inner)) tokens.push({ type: 'index', index: Number(inner) });
      else if (/^(['"]).*\1$/.test(inner)) tokens.push({ type: 'key', key: inner.slice(1, -1) });
      else throw new Error(`Cannot read [${inner}] — use a number, * or a quoted key`);
      i = end + 1;
      continue;
    }

    throw new Error(`Unexpected "${ch}" at position ${i}`);
  }
  return tokens;
}

/* Returns { found: false } or { found: true, value }. A wildcard anywhere in
   the path makes the value a list of every match. */
export function query(data, path) {
  const tokens = parsePath(path);
  let nodes = [data];
  let multi = false;

  for (const token of tokens) {
    const next = [];
    for (const node of nodes) {
      if (token.type === 'key') {
        if (node && typeof node === 'object' && !Array.isArray(node) && Object.prototype.hasOwnProperty.call(node, token.key)) {
          next.push(node[token.key]);
        }
      } else if (token.type === 'index') {
        if (Array.isArray(node)) {
          const at = token.index < 0 ? node.length + token.index : token.index;
          if (at >= 0 && at < node.length) next.push(node[at]);
        }
      } else {
        multi = true;
        if (Array.isArray(node)) next.push(...node);
        else if (node && typeof node === 'object') next.push(...Object.values(node));
      }
    }
    nodes = next;
  }

  if (!nodes.length) return { found: false };
  return { found: true, value: multi ? nodes : nodes[0] };
}

/* How an extracted value is written into a template: text as-is, a list of
   plain values comma-separated, anything else as JSON. */
export function stringify(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.every((v) => v === null || typeof v !== 'object')) return value.join(', ');
  if (value !== null && typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/* Splits a template into literal text and ${name} slots, filling each slot from
   `values`. Missing names are reported, never silently replaced — sending
   "undefined" to the next endpoint is exactly the failure this prevents. */
export function resolveTemplate(template, values) {
  const parts = [];
  const missing = [];
  const pattern = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
  let last = 0;
  let match;

  while ((match = pattern.exec(template)) !== null) {
    if (match.index > last) parts.push({ kind: 'text', text: template.slice(last, match.index) });
    const name = match[1];
    if (Object.prototype.hasOwnProperty.call(values, name)) {
      parts.push({ kind: 'value', name, text: stringify(values[name]) });
    } else {
      parts.push({ kind: 'missing', name, text: match[0] });
      if (!missing.includes(name)) missing.push(name);
    }
    last = pattern.lastIndex;
  }
  if (last < template.length) parts.push({ kind: 'text', text: template.slice(last) });

  return { parts, missing, text: parts.map((p) => p.text).join('') };
}
