#!/usr/bin/env node
/**
 * Ingest one report file by hand — useful for testing a new analyzer's output
 * format before pointing the watcher at its folder.
 *
 *   node scripts/ingest-file.js ./samples/sample-report.txt          # parse only
 *   node scripts/ingest-file.js ./report.pdf --send                  # parse and send
 */
import { ingestFile } from '../src/services/ingest.js';
import { closeDb } from '../src/db.js';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('-'));
const send = args.includes('--send');

if (!file) {
  console.error('Usage: node scripts/ingest-file.js <file> [--send]');
  process.exit(1);
}

const result = await ingestFile(file, { send, moveFiles: false });
console.log(JSON.stringify(result, null, 2));
closeDb();
process.exit(result.ok ? 0 : 1);
