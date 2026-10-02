import { db, unwrap } from '../db.js';
import { embedOne } from '../embeddings.js';

/*
  Four things change what this agent knows, and none of them is fine-tuning.

  1. Ingesting a file          -- new chunks, immediately retrievable.
  2. A correction              -- stored and searched on every later question.
  3. A vote on an answer       -- moves the ranking weight of what it cited.
  4. A refusal                 -- recorded as a gap, so you know what to upload.

  All four are reversible and inspectable: you can read every row that changed
  the agent's behaviour, and delete any of them. Weights inside a fine-tuned
  model are neither.
*/

/* How far one vote moves a chunk's weight. Small on purpose -- a single click
   should nudge the ranking, not rewrite it, and reinforce_chunks() clamps the
   cumulative result to [0.5, 2.0] so no chunk can run away. */
const UP = 0.05;
const DOWN = -0.08;   // a wrong answer is worth more evidence than a right one

/**
 * Record a vote, and optionally what the answer should have said.
 *
 * A correction is embedded against the *question*, not the answer: it has to be
 * found again by someone asking the same thing in different words.
 */
export async function recordFeedback({ agentId, interactionId, verdict, correction = null }) {
  const supabase = db();

  const interaction = interactionId
    ? unwrap(
        await supabase.from('interactions').select('id, question, cited_chunk_ids')
          .eq('id', interactionId).eq('agent_id', agentId).maybeSingle(),
        'looking up the interaction',
      )
    : null;

  unwrap(
    await supabase.from('feedback').insert({
      agent_id: agentId,
      interaction_id: interaction?.id ?? null,
      verdict,
      correction,
    }),
    'recording feedback',
  );

  const citedIds = interaction?.cited_chunk_ids || [];
  if (citedIds.length) {
    unwrap(
      await supabase.rpc('reinforce_chunks', {
        p_chunk_ids: citedIds,
        p_delta: verdict === 'up' ? UP : DOWN,
      }),
      'applying feedback to chunk weights',
    );
  }

  let learnedFactId = null;
  if (correction && interaction?.question) {
    learnedFactId = await teach({
      agentId,
      question: interaction.question,
      answer: correction,
      kind: 'correction',
      /* Tie the correction to the chunk that produced the bad answer, so the
         source of a recurring mistake is traceable later. */
      supersedesChunkId: citedIds[0] ?? null,
    });
  }

  return { learnedFactId, reinforced: citedIds.length };
}

/**
 * Teach a fact directly, without an interaction behind it.
 *
 * This is how you hand the agent something that is true but not written down
 * in any file -- a definition, an internal abbreviation, a policy.
 */
export async function teach({ agentId, question, answer, kind = 'fact', supersedesChunkId = null, confidence = 1.0 }) {
  const embedding = await embedOne(question || answer);
  const row = unwrap(
    await db().from('learned_facts').insert({
      agent_id: agentId,
      question: question || null,
      answer,
      kind,
      embedding,
      confidence,
      supersedes_chunk_id: supersedesChunkId,
    }).select('id').single(),
    'storing the learned fact',
  );
  return row.id;
}

export async function listLearned(agentId, limit = 50) {
  return unwrap(
    await db().from('learned_facts').select('id, question, answer, kind, confidence, created_at')
      .eq('agent_id', agentId).order('created_at', { ascending: false }).limit(limit),
    'listing learned facts',
  );
}

export async function unlearn({ agentId, factId }) {
  unwrap(
    await db().from('learned_facts').delete().eq('agent_id', agentId).eq('id', factId),
    'removing the learned fact',
  );
}

/**
 * The questions this agent could not answer.
 *
 * This is the most directly useful output of the whole logging layer: it is a
 * ranked list of what to upload next, written by the people actually using the
 * agent rather than guessed at in advance.
 */
export async function knowledgeGaps(agentId, limit = 20) {
  const rows = unwrap(
    await db().from('interactions').select('question, created_at')
      .eq('agent_id', agentId).eq('grounded', false)
      .order('created_at', { ascending: false }).limit(500),
    'reading knowledge gaps',
  );

  /* Group near-identical questions so ten people asking the same unanswerable
     thing reads as one gap of weight ten, not ten separate gaps. */
  const groups = new Map();
  for (const row of rows) {
    const key = row.question.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).sort().join(' ');
    const existing = groups.get(key);
    if (existing) { existing.count += 1; }
    else groups.set(key, { question: row.question, count: 1, lastAsked: row.created_at });
  }

  return [...groups.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}
