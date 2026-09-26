import test from 'node:test';
import assert from 'node:assert/strict';
import { ingestBuffer, forgetDocument } from '../src/ingest/pipeline.js';

/*
  The write path, without a database.

  Everything else in the suite stops at the point where a chunk is about to be
  stored. This file drives `ingestBuffer` against a recording fake that speaks
  the same chained dialect as supabase-js, so the parts that only run when
  something is actually written are exercised: the payload each row carries, the
  batching arithmetic, the pairing of chunks to their embeddings across a batch
  boundary, and the rollback that runs when embedding or insertion fails.

  The rollback matters more than its size suggests. A document row claims the
  content hash, so if it survives a failed ingest every retry is treated as a
  duplicate and skipped -- the file becomes permanently unlearnable. That branch
  had no test before this one, and no amount of running the happy path finds it.
*/

/** Builds a thenable query builder: chainable, awaitable, and it records. */
function builder(result, record) {
  const self = {
    select: () => self,
    eq: (column, value) => { record.filters.push([column, value]); return self; },
    maybeSingle: () => result,
    single: () => result,
    then: (resolve) => resolve(result),
  };
  return self;
}

/**
 * A fake service-role client.
 *
 * @param {object} [options]
 * @param {object|null} [options.existing] row returned by the dedupe lookup
 * @param {string} [options.chunkInsertError] message the Nth chunk insert fails with
 * @param {number} [options.failOnBatch] which chunk insert (0-based) fails
 */
function fakeClient({ existing = null, chunkInsertError = null, failOnBatch = 0 } = {}) {
  const calls = { documentInserts: [], chunkInserts: [], deletes: [], filters: [] };
  let chunkInsertCount = 0;

  const client = {
    from(table) {
      return {
        select: () => builder({ data: existing, error: null }, calls),
        insert(rows) {
          if (table === 'documents') {
            calls.documentInserts.push(rows);
            return builder({ data: { id: 'doc-1' }, error: null }, calls);
          }
          calls.chunkInserts.push(rows);
          const failing = chunkInsertError && chunkInsertCount === failOnBatch;
          chunkInsertCount += 1;
          return builder(
            failing ? { data: null, error: { message: chunkInsertError } } : { data: rows, error: null },
            calls,
          );
        },
        delete() {
          calls.deletes.push(table);
          return builder({ data: null, error: null }, calls);
        },
      };
    },
    calls,
  };
  return client;
}

/* First element is the call-order index, second is the length of the text that
   was embedded. Asserting on the second proves each stored row kept its own
   vector -- the off-by-one that a single-batch test cannot see. */
function stubEmbedder(texts) {
  return Promise.resolve(texts.map((text, i) => [i, text.length, 0]));
}

const NOTE = Buffer.from(
  'Claims desk\n\nCashless preauthorisation is decided within seven working days.\n',
  'utf8',
);

/* Comfortably more than one INSERT_BATCH of 200 chunks. Paragraphs sit near the
   900-character chunk target, so each becomes roughly one chunk. */
const BIG = Buffer.from(
  Array.from({ length: 240 }, (_, i) => `Section ${i}. ${'policy detail '.repeat(64)}`).join('\n\n'),
  'utf8',
);

test('re-uploading the same bytes is skipped, not stored twice', async () => {
  const client = fakeClient({ existing: { id: 'doc-old', chunk_count: 7, source_kind: 'text' } });

  const result = await ingestBuffer({
    agentId: 'agent-1', buffer: NOTE, filename: 'note.txt', client, embedder: stubEmbedder,
  });

  assert.deepEqual(result, { documentId: 'doc-old', chunks: 7, skipped: true, kind: 'text' });
  assert.equal(client.calls.documentInserts.length, 0, 'no second document row');
  assert.equal(client.calls.chunkInserts.length, 0, 'no chunks re-embedded or re-stored');
});

test('the dedupe lookup is scoped to one agent', async () => {
  const client = fakeClient();
  await ingestBuffer({
    agentId: 'agent-1', buffer: NOTE, filename: 'note.txt', client, embedder: stubEmbedder,
  });

  /* Without the agent_id filter, one tenant uploading a file would make it
     look like every other tenant already had it. */
  assert.ok(
    client.calls.filters.some(([column, value]) => column === 'agent_id' && value === 'agent-1'),
    'the lookup filters on agent_id',
  );
  assert.ok(
    client.calls.filters.some(([column]) => column === 'content_hash'),
    'the lookup filters on content_hash',
  );
});

test('the document row carries the hash, size and chunk count', async () => {
  const client = fakeClient();
  const result = await ingestBuffer({
    agentId: 'agent-1',
    buffer: NOTE,
    filename: '/tmp/uploads/note.txt',
    sourceRef: 's3://bucket/note.txt',
    client,
    embedder: stubEmbedder,
  });

  const [row] = client.calls.documentInserts;
  assert.equal(row.agent_id, 'agent-1');
  assert.equal(row.title, 'note.txt', 'the title is the basename, not the whole path');
  assert.equal(row.source_ref, 's3://bucket/note.txt');
  assert.equal(row.bytes, NOTE.length);
  assert.match(row.content_hash, /^[0-9a-f]{64}$/, 'a sha256 of the bytes');
  assert.equal(row.chunk_count, result.chunks, 'the count matches what was stored');
});

test('every chunk row is stored with its own text, locator and embedding', async () => {
  const client = fakeClient();
  await ingestBuffer({
    agentId: 'agent-1', buffer: NOTE, filename: 'note.txt', client, embedder: stubEmbedder,
  });

  const rows = client.calls.chunkInserts.flat();
  assert.ok(rows.length > 0, 'something was stored');
  for (const row of rows) {
    assert.equal(row.agent_id, 'agent-1');
    assert.equal(row.document_id, 'doc-1', 'chunks point at the document just created');
    assert.equal(typeof row.ordinal, 'number');
    assert.ok(row.text.length > 0);
    assert.ok(row.locator && typeof row.locator === 'object', 'a citation target came along');
    assert.ok(row.token_estimate > 0);
    assert.equal(row.embedding[1], row.text.length, 'this row kept its own vector');
  }
  assert.deepEqual(
    rows.map((row) => row.ordinal),
    rows.map((_, i) => i),
    'ordinals are contiguous from zero, so citation numbers line up',
  );
});

test('a long file is written in batches, and vectors stay with their chunks', async () => {
  const client = fakeClient();
  const result = await ingestBuffer({
    agentId: 'agent-1', buffer: BIG, filename: 'handbook.txt', client, embedder: stubEmbedder,
  });

  assert.ok(result.chunks > 200, `expected more than one batch, got ${result.chunks}`);
  assert.equal(
    client.calls.chunkInserts.length,
    Math.ceil(result.chunks / 200),
    'one insert per batch of 200',
  );
  assert.ok(
    client.calls.chunkInserts.every((batch) => batch.length <= 200),
    'no batch exceeds the limit',
  );

  /* The second batch is where `vectors[i + j]` earns its keep: `j` restarts at
     zero while the vector array does not. */
  const rows = client.calls.chunkInserts.flat();
  assert.equal(rows.length, result.chunks);
  for (const row of rows) {
    assert.equal(row.embedding[1], row.text.length, `row ${row.ordinal} kept its own vector`);
  }
  assert.equal(rows.at(-1).embedding[0], result.chunks - 1, 'the last row got the last vector');
});

test('a failure while embedding takes the document row with it', async () => {
  const client = fakeClient();
  const failing = () => Promise.reject(new Error('the model could not be loaded'));

  await assert.rejects(
    ingestBuffer({ agentId: 'agent-1', buffer: NOTE, filename: 'note.txt', client, embedder: failing }),
    /the model could not be loaded/,
    'the caller hears about it',
  );

  assert.equal(client.calls.documentInserts.length, 1, 'the document row was created');
  assert.deepEqual(client.calls.deletes, ['documents'], 'and then removed, freeing the hash to retry');
});

test('a failure while storing chunks takes the document row with it', async () => {
  const client = fakeClient({ chunkInsertError: 'value too long for type character varying' });

  await assert.rejects(
    ingestBuffer({ agentId: 'agent-1', buffer: NOTE, filename: 'note.txt', client, embedder: stubEmbedder }),
    /storing chunks: value too long/,
    'the message says which step failed',
  );

  assert.deepEqual(client.calls.deletes, ['documents'], 'the half-written document is gone');
});

test('a failure in a later batch still rolls the whole document back', async () => {
  const client = fakeClient({ chunkInsertError: 'connection reset', failOnBatch: 1 });

  await assert.rejects(
    ingestBuffer({ agentId: 'agent-1', buffer: BIG, filename: 'handbook.txt', client, embedder: stubEmbedder }),
    /storing chunks: connection reset/,
  );

  assert.equal(client.calls.chunkInserts.length, 2, 'it stopped at the failing batch');
  assert.deepEqual(client.calls.deletes, ['documents'], 'the chunks already written go with the cascade');
});

test('an unreadable file is refused before any row is written', async () => {
  const client = fakeClient();
  const binary = Buffer.from([0x00, 0x01, 0x02, 0x00, 0xff, 0xfe]);

  await assert.rejects(
    ingestBuffer({ agentId: 'agent-1', buffer: binary, filename: 'blob.bin', client, embedder: stubEmbedder }),
  );

  assert.equal(client.calls.documentInserts.length, 0, 'no document row claimed the hash');
  assert.equal(client.calls.chunkInserts.length, 0);
});

test('forgetting a document is scoped to the agent that owns it', async () => {
  const client = fakeClient();
  await forgetDocument({ agentId: 'agent-1', documentId: 'doc-1', client });

  assert.deepEqual(client.calls.deletes, ['documents']);
  assert.ok(
    client.calls.filters.some(([column, value]) => column === 'agent_id' && value === 'agent-1'),
    'one agent cannot delete another agent\'s document by guessing its id',
  );
});
