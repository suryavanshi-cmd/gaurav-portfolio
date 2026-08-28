import path from 'node:path';
import fs from 'node:fs/promises';
import { readPdf, looksScanned } from './pdf.js';
import { readCsv } from './csv.js';
import { extractMeasurements, extractPatient } from './text-extract.js';

export class UnparseableReport extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'UnparseableReport';
    this.code = code;
  }
}

const TEXT_EXTS = new Set(['.txt', '.dat', '.out', '.lis', '.hl7', '.asc']);
const CSV_EXTS = new Set(['.csv', '.tsv']);

export function isSupported(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.pdf' || TEXT_EXTS.has(ext) || CSV_EXTS.has(ext);
}

/**
 * Reads one analyzer output file and returns everything we could learn from it.
 * Throws UnparseableReport when the file cannot be turned into a report — the
 * watcher moves those to FAILED_DIR for a human to look at, rather than
 * guessing and sending a wrong result to a patient.
 */
export async function parseReportFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let text = '';
  let measurements = [];
  let pages = 0;

  if (ext === '.pdf') {
    const pdf = await readPdf(filePath);
    text = pdf.text;
    pages = pdf.pages;
    if (looksScanned(text)) {
      throw new UnparseableReport(
        'PDF has no readable text layer — it looks like a scan. This app does not OCR reports.',
        'SCANNED_PDF',
      );
    }
  } else if (CSV_EXTS.has(ext)) {
    const csv = await readCsv(filePath);
    measurements = csv.measurements;
    text = csv.text;
  } else if (TEXT_EXTS.has(ext)) {
    text = await fs.readFile(filePath, 'utf8');
  } else {
    throw new UnparseableReport(`Unsupported file type: ${ext || '(none)'}`, 'UNSUPPORTED_TYPE');
  }

  if (measurements.length === 0) measurements = extractMeasurements(text);
  const patient = extractPatient(text);

  if (measurements.length === 0) {
    throw new UnparseableReport('No recognisable test results found in the file.', 'NO_MEASUREMENTS');
  }

  return { patient, measurements, text, pages, sourceFile: path.basename(filePath) };
}
