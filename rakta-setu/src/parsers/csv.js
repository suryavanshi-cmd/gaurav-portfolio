import fs from 'node:fs/promises';
import { ALIAS_INDEX } from '../domain/analytes.js';

/**
 * Many LIS packages can export a flat result table instead of (or alongside)
 * a PDF. That path is far more reliable than scraping a PDF, so if the lab can
 * produce CSV, prefer it — see docs/ARCHITECTURE.md.
 *
 * Expected shape (header names are matched loosely, order does not matter):
 *   Test, Result, Unit, Reference
 * Patient metadata may appear as `key,value` lines before the table.
 */

function splitCsvLine(line, delimiter) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i += 1; }
      else inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      out.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function detectDelimiter(sample) {
  const counts = [',', ';', '\t', '|'].map((d) => [d, (sample.match(new RegExp(`\\${d}`, 'g')) || []).length]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ',';
}

function analyteKeyFor(label) {
  const lower = String(label || '').toLowerCase().trim();
  if (!lower) return null;
  for (const { alias, key } of ALIAS_INDEX) {
    if (lower === alias) return key;
  }
  for (const { alias, key } of ALIAS_INDEX) {
    const idx = lower.indexOf(alias);
    if (idx === -1) continue;
    const before = idx === 0 ? ' ' : lower[idx - 1];
    const after = lower[idx + alias.length] ?? ' ';
    if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) return key;
  }
  return null;
}

const HEADER_HINTS = {
  test: /^(test|test\s*name|investigation|parameter|analyte|description)$/i,
  result: /^(result|value|observed(\s*value)?|reading)$/i,
  unit: /^(unit|units)$/i,
};

export async function readCsv(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const delimiter = detectDelimiter(raw.split(/\r?\n/).slice(0, 10).join('\n'));
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());

  let headerIdx = -1;
  let cols = { test: -1, result: -1, unit: -1 };

  for (let i = 0; i < Math.min(lines.length, 40); i += 1) {
    const cells = splitCsvLine(lines[i], delimiter);
    const found = { test: -1, result: -1, unit: -1 };
    cells.forEach((cell, idx) => {
      for (const [name, re] of Object.entries(HEADER_HINTS)) {
        if (found[name] === -1 && re.test(cell)) found[name] = idx;
      }
    });
    if (found.test !== -1 && found.result !== -1) { headerIdx = i; cols = found; break; }
  }

  const measurements = [];
  if (headerIdx !== -1) {
    for (let i = headerIdx + 1; i < lines.length; i += 1) {
      const cells = splitCsvLine(lines[i], delimiter);
      const key = analyteKeyFor(cells[cols.test]);
      if (!key) continue;
      const value = Number.parseFloat(String(cells[cols.result] ?? '').replace(/,/g, ''));
      if (!Number.isFinite(value)) continue;
      measurements.push({
        key,
        value,
        unit: cols.unit !== -1 ? (cells[cols.unit] || null) : null,
        rawLabel: cells[cols.test],
      });
    }
  }

  // The whole file is still handed to the text extractor so patient metadata
  // in `key,value` preamble lines (and any table we failed to detect) is found.
  return { measurements, text: raw.split(/\r?\n/).map((l) => l.replace(new RegExp(`\\${delimiter}`, 'g'), ' : ')).join('\n') };
}
