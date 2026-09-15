import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { db, unwrap } from '../db.js';
import { embed } from '../embeddings.js';
import { parseFile } from './parse.js';
import { chunkBlocks } from './chunk.js';

/* Written in batches so a large workbook does not arrive as one enormous
   INSERT that the connection times out on halfway through. */
const INSERT_BATCH = 200;

/**
 * Teach an agent a file: parse it, chunk it, embed it, store it.
 *
 * Re-uploading the same bytes is a no-op rather than a duplicate. That matters
 * more than it sounds: two identical copies of a chunk split the retrieval
 * score between them and can push the real answer off the end of the list.
 *
 * @returns {Promise<{documentId: string, chunks: number, skipped?: boolean, kind: string}>}
 */
export async function ingestBuffer({ agentId, buffer, filename, sourceRef = null }) {
  const supabase = db();
  const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');

  const existing = unwrap(
    await supabase.from('documents').select('id, chunk_count, source_kind')
      .eq('agent_id', agentId).eq('content_hash', contentHash).maybeSingle(),
    'checking for an existing copy',
  );
  if (existing) {
    return { documentId: existing.id, chunks: existing.chunk_count, skipped: true, kind: existing.source_kind };
  }

  const { kind, blocks, metadata } = await parseFile(buffer, filename);
  const chunks = chunkBlocks(blocks);
  if (!chunks.length) throw new Error('Nothing readable was found in this file.');

  const document = unwrap(
    await supabase.from('documents').insert({
      agent_id: agentId,
      title: path.basename(String(filename)),
      source_kind: kind,
      source_ref: sourceRef ?? String(filename),
      content_hash: contentHash,
      bytes: buffer.length,
      metadata,
      chunk_count: chunks.length,
    }).select('id').single(),
    'creating the document',
  );

  try {
    const vectors = await embed(chunks.map((c) => c.text));
    for (let i = 0; i < chunks.length; i += INSERT_BATCH) {
      const slice = chunks.slice(i, i + INSERT_BATCH);
      unwrap(
        await supabase.from('chunks').insert(slice.map((chunk, j) => ({
          agent_id: agentId,
          document_id: document.id,
          ordinal: chunk.ordinal,
          text: chunk.text,
          locator: chunk.locator,
          token_estimate: chunk.token_estimate,
          embedding: vectors[i + j],
        }))),
        'storing chunks',
      );
    }
  } catch (err) {
    /* A document row with no chunks is worse than no document row: it claims
       the content hash, so a retry would be treated as a duplicate and skipped
       forever. The cascade takes the partial chunks with it. */
    await supabase.from('documents').delete().eq('id', document.id);
    throw err;
  }

  return { documentId: document.id, chunks: chunks.length, kind };
}

/** Same pipeline, reading from disk. Used by the CLI and the folder watcher. */
export async function ingestPath({ agentId, filePath }) {
  const buffer = await fs.readFile(filePath);
  return ingestBuffer({ agentId, buffer, filename: path.basename(filePath), sourceRef: filePath });
}

/** Forget one document: its chunks go with it via the foreign key cascade. */
export async function forgetDocument({ agentId, documentId }) {
  const supabase = db();
  unwrap(
    await supabase.from('documents').delete().eq('agent_id', agentId).eq('id', documentId),
    'deleting the document',
  );
}
