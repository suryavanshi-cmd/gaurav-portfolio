import { createRequire } from 'node:module';
import path from 'node:path';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import AdmZip from 'adm-zip';

/* pdf-parse's package entry point runs a debug block that reads a bundled test
   PDF and throws when it is missing. Importing the library file directly is the
   documented way around it. */
const require = createRequire(import.meta.url);

/**
 * Every parser returns the same shape:
 *
 *   { kind, blocks: [{ text, locator }], metadata }
 *
 * A "block" is a natural unit of the source -- one spreadsheet row, one PDF
 * page, one heading's worth of prose. Blocks are not yet chunks: chunk.js packs
 * them to a target size. Keeping the two apart is what lets a spreadsheet row
 * never be split down the middle while a 40-page PDF still gets divided.
 */

const SHEET_EXTS = new Set(['.xlsx', '.xls', '.xlsm', '.xlsb', '.ods', '.fods', '.csv', '.tsv', '.dbf', '.dif', '.prn']);
const TEXTY_EXTS = new Set([
  '.txt', '.md', '.markdown', '.rst', '.log', '.text', '.adoc',
  '.json', '.jsonl', '.ndjson', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.env',
  '.xml', '.sql', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.java', '.rb', '.go',
  '.rs', '.c', '.h', '.cpp', '.cs', '.php', '.sh', '.bash', '.ps1', '.r', '.scala', '.kt',
  '.vue', '.svelte', '.css', '.scss', '.srt', '.vtt', '.tex', '.bib', '.gitignore',
]);

/** Collapse runs of whitespace without destroying paragraph boundaries. */
function tidy(text) {
  return String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ------------------------------------------------------------------ sheets */

/**
 * Spreadsheets are the format most often ingested badly. Dumping a sheet as
 * CSV text produces chunks like "12,44,,7,2026-01-03" -- which match nothing,
 * because the column names live in a row that ended up in a different chunk.
 *
 * So each row is rendered as `Column: value` pairs, carrying its own header
 * with it, and every sheet also gets a summary block describing its shape. A
 * question like "what columns are in the claims file" is answered by the
 * summary; "what did invoice 4417 settle for" is answered by the row.
 */
function parseSheet(buffer, ext) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, dense: false });
  const blocks = [];
  const sheets = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    /* defval keeps empty cells as columns rather than silently shifting values
       left, which would misalign every field after the first blank. */
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false, raw: false });
    if (!rows.length) continue;

    const headerRowIndex = findHeaderRow(rows);
    const header = (rows[headerRowIndex] || []).map((h, i) => tidy(h) || `Column ${i + 1}`);
    const body = rows.slice(headerRowIndex + 1).filter((r) => r.some((c) => tidy(c) !== ''));

    sheets.push({ name: sheetName, columns: header, rows: body.length });

    blocks.push({
      text: describeSheet(sheetName, header, body),
      locator: { sheet: sheetName, kind: 'summary' },
    });

    body.forEach((row, i) => {
      const pairs = header
        .map((col, c) => [col, tidy(row[c])])
        .filter(([, value]) => value !== '')
        .map(([col, value]) => `${col}: ${value}`);
      if (!pairs.length) return;
      /* The sheet name rides along so a question naming the tab ("in the Q3
         sheet...") has something to match on in every row. */
      blocks.push({
        text: `[${sheetName}] ${pairs.join(' | ')}`,
        locator: { sheet: sheetName, row: headerRowIndex + 2 + i, kind: 'row' },
      });
    });
  }

  return { kind: ext.replace('.', '') || 'sheet', blocks, metadata: { sheets } };
}

/**
 * Real exports rarely start with the header on row 1 -- there is a title, a
 * blank, a "Generated on ..." line. The header is the first row whose cells are
 * mostly short non-numeric labels and which has more filled cells than the rows
 * above it.
 */
function findHeaderRow(rows) {
  const limit = Math.min(rows.length, 12);
  let best = 0;
  let bestScore = -Infinity;

  for (let i = 0; i < limit; i += 1) {
    const cells = (rows[i] || []).map((c) => tidy(c));
    const filled = cells.filter((c) => c !== '');
    if (filled.length < 2) continue;

    const labels = filled.filter((c) => Number.isNaN(Number(c)) && c.length <= 60).length;
    /* Density rewards a wide, fully-populated row; the labels ratio rewards
       one made of words rather than figures. A title row scores badly on
       density (one cell), a data row scores badly on labels (all numbers). */
    const score = (labels / filled.length) * 2 + filled.length / Math.max(cells.length, 1) - i * 0.08;
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return best;
}

/** A retrievable description of a sheet's shape, values included. */
function describeSheet(sheetName, header, body) {
  const lines = [
    `Sheet "${sheetName}" has ${body.length} data row${body.length === 1 ? '' : 's'} and ${header.length} column${header.length === 1 ? '' : 's'}.`,
    `Columns: ${header.join(', ')}.`,
  ];

  header.forEach((col, c) => {
    const values = body.map((r) => tidy(r[c])).filter((v) => v !== '');
    if (!values.length) return;
    const numbers = values.map(Number).filter((n) => Number.isFinite(n));

    if (numbers.length >= values.length * 0.8 && numbers.length > 0) {
      const total = numbers.reduce((s, n) => s + n, 0);
      lines.push(
        `Column "${col}" is numeric: minimum ${Math.min(...numbers)}, maximum ${Math.max(...numbers)}, ` +
        `total ${round(total)}, average ${round(total / numbers.length)} across ${numbers.length} values.`,
      );
    } else {
      const unique = [...new Set(values)];
      /* Listing the distinct values of a small category column is what lets
         "which regions are covered" be answered without scanning every row. */
      const sample = unique.slice(0, 15).join(', ');
      lines.push(
        `Column "${col}" has ${unique.length} distinct value${unique.length === 1 ? '' : 's'}` +
        (unique.length <= 15 ? `: ${sample}.` : `, for example: ${sample}.`),
      );
    }
  });

  return lines.join('\n');
}

function round(n) {
  return Number.isInteger(n) ? n : Number(n.toFixed(2));
}

/* --------------------------------------------------------------------- pdf */

async function parsePdf(buffer) {
  const pdfParse = require('pdf-parse/lib/pdf-parse.js');
  const result = await pdfParse(buffer);
  const raw = result.text || '';

  /* A PDF with no text layer is a scan. Ingesting it would store a handful of
     stray ligatures and then answer questions from them, which is worse than
     refusing: the agent would look confident and be empty. */
  const alnum = raw.replace(/[^A-Za-z0-9]/g, '');
  if (alnum.length < 80) {
    throw new Error(
      'This PDF has no text layer -- it is a scan or images. Run it through OCR first ' +
      '(macOS Preview, Adobe, or `ocrmypdf in.pdf out.pdf`) and upload the result.',
    );
  }

  /* pdf-parse separates pages with a form feed, which keeps page numbers
     available for citation. */
  const pages = raw.split('\f');
  const blocks = pages
    .map((text, i) => ({ text: tidy(text), locator: { page: i + 1, kind: 'page' } }))
    .filter((b) => b.text.length > 0);

  return { kind: 'pdf', blocks, metadata: { pages: result.numpages ?? pages.length } };
}

/* -------------------------------------------------------------------- word */

async function parseDocx(buffer) {
  /* Converting to Markdown rather than raw text keeps headings and list
     structure, which chunk.js then uses as split points. */
  const { value } = await mammoth.convertToMarkdown({ buffer });
  return { kind: 'docx', blocks: splitByHeading(tidy(value)), metadata: {} };
}

/* ------------------------------------------------------------- powerpoint */

/**
 * A .pptx is a zip of XML. Each slide is its own file, which makes "slide 7"
 * a natural block and a precise citation.
 */
function parsePptx(buffer) {
  const zip = new AdmZip(buffer);
  const slides = zip.getEntries()
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
    .sort((a, b) => slideNumber(a.entryName) - slideNumber(b.entryName));

  const blocks = slides.map((entry) => {
    const xml = entry.getData().toString('utf8');
    /* <a:t> holds every run of visible text; paragraph breaks come from
       </a:p>, so they are turned into newlines before tags are stripped. */
    const text = tidy(
      xml.replace(/<\/a:p>/g, '\n').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'"),
    );
    return { text, locator: { slide: slideNumber(entry.entryName), kind: 'slide' } };
  }).filter((b) => b.text.length > 0);

  if (!blocks.length) throw new Error('No text found in this presentation.');
  return { kind: 'pptx', blocks, metadata: { slides: blocks.length } };
}

function slideNumber(name) {
  return Number(name.match(/slide(\d+)\.xml$/)?.[1] || 0);
}

/* -------------------------------------------------------------------- text */

function parseHtml(text) {
  const stripped = text
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|section|article|li|tr|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return { kind: 'html', blocks: splitByHeading(tidy(stripped)), metadata: {} };
}

/** RTF without a dependency: drop control words, groups and escapes. */
function parseRtf(text) {
  const stripped = text
    .replace(/\\'([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\par[d]?\b/g, '\n')
    .replace(/\\[a-z]+-?\d*\s?/gi, '')
    .replace(/[{}]/g, '');
  return { kind: 'rtf', blocks: splitByHeading(tidy(stripped)), metadata: {} };
}

/**
 * JSON and JSONL become one block per record, rendered as flattened
 * `path: value` lines -- the same treatment spreadsheet rows get, and for the
 * same reason: a record should be retrievable on its own terms.
 */
function parseJson(text, ext) {
  const records = [];
  if (ext === '.jsonl' || ext === '.ndjson') {
    text.split('\n').forEach((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      try { records.push({ value: JSON.parse(trimmed), index: i + 1 }); } catch { /* skip bad line */ }
    });
  } else {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) parsed.forEach((value, i) => records.push({ value, index: i + 1 }));
    else records.push({ value: parsed, index: 1 });
  }

  if (!records.length) throw new Error('No JSON records found.');

  const blocks = records.map(({ value, index }) => ({
    text: flatten(value).map(([k, v]) => `${k}: ${v}`).join(' | ') || String(value),
    locator: { record: index, kind: 'record' },
  })).filter((b) => b.text.trim().length > 0);

  return { kind: 'json', blocks, metadata: { records: blocks.length } };
}

function flatten(value, prefix = '', out = []) {
  if (value === null || value === undefined) return out;
  if (Array.isArray(value)) {
    value.forEach((v, i) => flatten(v, prefix ? `${prefix}[${i}]` : `[${i}]`, out));
  } else if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else {
    out.push([prefix || 'value', String(value)]);
  }
  return out;
}

/** Markdown and plain prose split on headings, then on blank lines. */
function splitByHeading(text) {
  if (!text) return [];
  const lines = text.split('\n');
  const blocks = [];
  let heading = '';
  let buffer = [];

  const flush = () => {
    const body = tidy(buffer.join('\n'));
    if (body) blocks.push({ text: heading ? `${heading}\n${body}` : body, locator: heading ? { heading, kind: 'section' } : { kind: 'text' } });
    buffer = [];
  };

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.*)$/);
    if (match) { flush(); heading = match[2].trim(); } else buffer.push(line);
  }
  flush();
  return blocks.length ? blocks : [{ text, locator: { kind: 'text' } }];
}

/* ---------------------------------------------------------------- dispatch */

/**
 * True when a buffer decodes as text a person could read. This is what makes
 * "any readable type" literal rather than a list: an unknown extension is
 * ingested as text if its bytes are text, and refused with a clear reason if
 * they are not.
 */
export function looksLikeText(buffer) {
  const sample = buffer.subarray(0, 8192);
  if (!sample.length) return false;
  if (sample.includes(0)) return false;  // NUL byte: binary

  const decoded = new TextDecoder('utf-8', { fatal: false }).decode(sample);
  if (decoded.includes('�')) return false;  // invalid UTF-8 sequences

  /* Tab, newline and carriage return are the only control characters expected
     in text; more than a few percent of anything else means binary. */
  const controls = [...decoded].filter((ch) => {
    const code = ch.codePointAt(0);
    return code < 32 && code !== 9 && code !== 10 && code !== 13;
  }).length;
  return controls / decoded.length < 0.03;
}

/**
 * @param {Buffer} buffer raw file bytes
 * @param {string} filename used only to pick a parser
 * @returns {Promise<{kind: string, blocks: Array<{text: string, locator: object}>, metadata: object}>}
 */
export async function parseFile(buffer, filename) {
  const ext = path.extname(String(filename || '')).toLowerCase();

  if (SHEET_EXTS.has(ext)) return parseSheet(buffer, ext);
  if (ext === '.pdf') return parsePdf(buffer);
  if (ext === '.docx') return parseDocx(buffer);
  if (ext === '.pptx') return parsePptx(buffer);
  if (ext === '.doc' || ext === '.ppt') {
    throw new Error(
      `${ext} is the pre-2007 binary Office format. Open it and "Save As" ${ext}x, then upload that.`,
    );
  }

  /* Everything below is text of some shape. Decode once, then choose a
     structure-aware reader for the formats that have structure worth keeping. */
  if (!looksLikeText(buffer)) {
    throw new Error(
      `Cannot read ${ext || 'this file'} -- it is binary and has no parser. ` +
      'Supported: Excel (xlsx/xls/xlsm/xlsb/ods/csv/tsv), PDF, Word (docx), PowerPoint (pptx), ' +
      'and any text-based file (txt, md, json, xml, yaml, html, rtf, source code).',
    );
  }

  const text = buffer.toString('utf8').replace(/^﻿/, '');
  if (ext === '.html' || ext === '.htm' || ext === '.xhtml') return parseHtml(text);
  if (ext === '.rtf') return parseRtf(text);
  if (ext === '.json' || ext === '.jsonl' || ext === '.ndjson') {
    try { return parseJson(text, ext); } catch { /* malformed: fall through to plain text */ }
  }

  const blocks = splitByHeading(tidy(text));
  if (!blocks.length) throw new Error('This file is empty.');
  return { kind: ext.replace('.', '') || 'text', blocks, metadata: {} };
}

export const SUPPORTED = {
  spreadsheets: [...SHEET_EXTS],
  documents: ['.pdf', '.docx', '.pptx', '.rtf', '.html'],
  text: [...TEXTY_EXTS],
  note: 'Any other file whose bytes decode as UTF-8 text is ingested as plain text.',
};
