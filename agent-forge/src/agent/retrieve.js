import { db, unwrap } from '../db.js';
import { embedOne } from '../embeddings.js';
import { config } from '../config.js';

/**
 * One question in, the evidence for it out.
 *
 * The question is embedded once and used for both searches: the vector search
 * inside hybrid_search, and the correction lookup. Corrections are kept
 * separate from chunks rather than fused with them because they answer a
 * different question -- not "what does the data say" but "what were we told
 * the data actually means".
 *
 * @returns {Promise<{chunks: Array, corrections: Array, topScore: number}>}
 */
export async function retrieve({ agent, question }) {
  const supabase = db();
  const embedding = await embedOne(question);

  const [chunks, corrections] = await Promise.all([
    supabase.rpc('hybrid_search', {
      p_agent_id: agent.id,
      p_query_embedding: embedding,
      p_query_text: question,
      p_limit: agent.max_context_chunks,
      p_pool: config.retrieval.pool,
    }).then((r) => unwrap(r, 'searching chunks')),

    supabase.rpc('match_learned_facts', {
      p_agent_id: agent.id,
      p_query_embedding: embedding,
      p_limit: 3,
    }).then((r) => unwrap(r, 'searching corrections')),
  ]);

  const relevant = (corrections || []).filter((c) => c.similarity >= config.retrieval.correctionThreshold);
  /* The gate reads similarity, so that is what gets reported and logged. */
  const topScore = chunks?.[0]?.similarity ?? 0;

  return { chunks: chunks || [], corrections: relevant, topScore };
}

/** "Sheet Q3, rows 14-19" -- something a person can act on. */
export function describeLocator(locator = {}) {
  const parts = [];
  if (locator.sheet) parts.push(`sheet "${locator.sheet}"`);
  if (locator.rows) parts.push(`rows ${locator.rows[0]}-${locator.rows[1]}`);
  else if (locator.row) parts.push(`row ${locator.row}`);
  if (locator.pages) parts.push(`pages ${locator.pages[0]}-${locator.pages[1]}`);
  else if (locator.page) parts.push(`page ${locator.page}`);
  if (locator.slide) parts.push(`slide ${locator.slide}`);
  if (locator.records) parts.push(`records ${locator.records[0]}-${locator.records[1]}`);
  else if (locator.record) parts.push(`record ${locator.record}`);
  if (locator.heading) parts.push(`"${locator.heading}"`);
  return parts.join(', ');
}
