#!/usr/bin/env node
/**
 * Loads the bundled sample report so you can see the whole patient experience
 * without a blood analyzer, a WhatsApp account or an API key.
 *
 *   npm run seed
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ingestFile } from '../src/services/ingest.js';
import { getReportById } from '../src/services/reports.js';
import { lastFour } from '../src/util/phone.js';
import { closeDb } from '../src/db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const sample = path.join(here, '..', 'samples', 'sample-report.txt');

const result = await ingestFile(sample, { send: false, moveFiles: false });

if (!result.ok) {
  console.error('\n❌ Seeding failed:', result.reason, result.message ?? '');
  closeDb();
  process.exit(1);
}

if (result.duplicate) {
  console.log('\nℹ️  Sample already seeded. Delete data/rakta-setu.sqlite to start over.');
}

const report = getReportById(result.reportId);
const rule = '─'.repeat(64);

console.log(`\n${rule}`);
console.log('  डेमो अहवाल तयार · demo report ready');
console.log(rule);
console.log(`  रुग्ण / patient : ${report.patient.name} (${report.patient.age}, ${report.patient.sex})`);
console.log(`  तपासण्या / tests: ${report.interpretation.counts.total} — ${report.interpretation.counts.abnormal} abnormal`);
console.log('');
console.log(`  🔗  ${result.url}`);
console.log(`  🔑  PIN (last 4 digits of the patient's phone): ${lastFour(report.patient.phone)}`);
console.log(rule);
console.log('\n  Start the server with `npm start`, then open the link above.\n');

closeDb();
