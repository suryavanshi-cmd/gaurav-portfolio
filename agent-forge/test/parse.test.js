import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { parseFile, looksLikeText } from '../src/ingest/parse.js';

function workbook(sheets) {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

test('a spreadsheet row carries its column names', async () => {
  const buffer = workbook({
    Claims: [
      ['Claim ID', 'Member', 'Amount', 'Status'],
      ['CLM-4417', 'R. Deshmukh', '18500', 'Settled'],
      ['CLM-4418', 'S. Patil', '9200', 'Pending'],
    ],
  });

  const { kind, blocks } = await parseFile(buffer, 'claims.xlsx');
  assert.equal(kind, 'xlsx');

  /* find the row, not the summary -- the summary lists distinct values and
     so also contains this ID. */
  const row = blocks.find((b) => b.locator.kind === 'row' && b.text.includes('CLM-4417'));
  /* The point of the whole parser: this row is retrievable on "amount" or
     "status" even though those words appear only in the header. */
  assert.match(row.text, /Claim ID: CLM-4417/);
  assert.match(row.text, /Amount: 18500/);
  assert.match(row.text, /Status: Settled/);
  assert.equal(row.locator.sheet, 'Claims');
  assert.equal(row.locator.row, 2);
});

test('each sheet gets a summary describing its shape', async () => {
  const buffer = workbook({
    Claims: [
      ['Claim ID', 'Amount', 'Region'],
      ['CLM-1', '100', 'Pune'],
      ['CLM-2', '300', 'Mumbai'],
      ['CLM-3', '200', 'Pune'],
    ],
  });

  const { blocks } = await parseFile(buffer, 'claims.xlsx');
  const summary = blocks.find((b) => b.locator.kind === 'summary');

  assert.match(summary.text, /3 data rows and 3 columns/);
  assert.match(summary.text, /minimum 100, maximum 300/);
  assert.match(summary.text, /total 600, average 200/);
  /* A category column lists its values, so "which regions" is answerable
     without reading every row. */
  assert.match(summary.text, /2 distinct values: Pune, Mumbai/);
});

test('a header below a title row is still found', async () => {
  const buffer = workbook({
    Report: [
      ['Quarterly Claims Report'],
      [],
      ['Claim ID', 'Amount'],
      ['CLM-9', '500'],
    ],
  });

  const { blocks } = await parseFile(buffer, 'report.xlsx');
  const row = blocks.find((b) => b.locator.kind === 'row' && b.text.includes('CLM-9'));
  assert.match(row.text, /Claim ID: CLM-9/);
  assert.doesNotMatch(row.text, /Quarterly Claims Report: /);
});

test('csv is read like any other sheet', async () => {
  const csv = Buffer.from('Name,Role\nGaurav,SDET\nAsha,Analyst\n');
  const { blocks } = await parseFile(csv, 'people.csv');
  assert.ok(blocks.some((b) => /Name: Gaurav \| Role: SDET/.test(b.text)));
});

test('json records become one block each, flattened', async () => {
  const json = Buffer.from(JSON.stringify([
    { id: 1, customer: { name: 'Asha', city: 'Pune' }, total: 4200 },
  ]));
  const { blocks } = await parseFile(json, 'orders.json');
  assert.match(blocks[0].text, /customer\.name: Asha/);
  assert.match(blocks[0].text, /total: 4200/);
});

test('markdown splits on headings and keeps them', async () => {
  const md = Buffer.from('# Refund policy\nRefunds take 7 days.\n\n# Escalation\nCall the TPA desk.');
  const { blocks } = await parseFile(md, 'policy.md');
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].locator.heading, 'Refund policy');
  assert.match(blocks[0].text, /Refunds take 7 days/);
});

test('an unknown extension is ingested when its bytes are text', async () => {
  const buffer = Buffer.from('server: prod-01\nregion: ap-south-1\n');
  const { blocks } = await parseFile(buffer, 'inventory.weirdext');
  assert.match(blocks[0].text, /prod-01/);
});

test('a binary file with no parser is refused with a useful message', async () => {
  const buffer = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0x00, 0x03]);
  await assert.rejects(
    () => parseFile(buffer, 'mystery.bin'),
    /binary and has no parser/,
  );
});

test('legacy .doc is named as the problem, with the fix', async () => {
  await assert.rejects(
    () => parseFile(Buffer.from('anything'), 'old.doc'),
    /Save As" \.docx/,
  );
});

test('looksLikeText rejects NUL bytes and accepts UTF-8 prose', () => {
  assert.equal(looksLikeText(Buffer.from('a normal sentence')), true);
  assert.equal(looksLikeText(Buffer.from('क्लेम प्रक्रिया')), true);
  assert.equal(looksLikeText(Buffer.from([0x50, 0x00, 0x4b])), false);
});
