import { createRequire } from 'node:module';
import fs from 'node:fs/promises';

// pdf-parse's package entry point runs a debug block that reads a bundled
// test PDF and throws when it is missing. Importing the library file directly
// is the documented way around it.
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

/** @returns {Promise<{text: string, pages: number}>} */
export async function readPdf(filePath) {
  const buffer = await fs.readFile(filePath);
  const result = await pdfParse(buffer);
  return { text: result.text || '', pages: result.numpages ?? 0 };
}

/**
 * True when the PDF yielded no meaningful text layer — i.e. it is a scan.
 * These need OCR, which this app deliberately does not attempt: silently
 * mis-reading a scanned blood report is worse than refusing it.
 */
export function looksScanned(text) {
  const alnum = String(text || '').replace(/[^A-Za-z0-9]/g, '');
  return alnum.length < 80;
}
