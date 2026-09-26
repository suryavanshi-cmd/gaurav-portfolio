import { db, unwrap } from '../db.js';
import { embedOne } from '../embeddings.js';
import { ask, REFUSAL } from './answer.js';

/*
  Many agents, one question.

  An agent's claim on a question is not a description someone wrote when they
  created it -- descriptions go stale the moment a new file is ingested. It is
  the best evidence the agent actually holds right now, scored at query time.
  That makes routing self-maintaining: teach an agent a new subject and it
  starts winning questions about it, with nothing to update.

  The team answer is a *composition* of independently grounded answers, not a
  conversation between agents. That is deliberate. If agent A asked agent B a
  question and quoted the reply, B's answer would enter A's context as plain
  text with no passages behind it, and A could then build on it freely -- the
  grounding guarantee would be laundered away in one hop. Instead each agent
  answers its own question against its own data, passes its own three checks,
  and keeps its own citations. Nothing is merged that was not separately proven.
*/

/**
 * Rank the agents that hold evidence for a question.
 *
 * @returns {Promise<Array<{agent_id, slug, name, best_similarity, supporting}>>}
 */
export async function route({ question, limit = 5 }) {
  const embedding = await embedOne(question);
  return unwrap(
    await db().rpc('route_agents', { p_query_embedding: embedding, p_limit: limit }),
    'routing the question',
  );
}

/**
 * Which of the routed agents are worth asking.
 *
 * `spread` is how far below the leader a second agent may sit and still be
 * consulted. Without it, every question with one clear owner would still pay
 * for a full fan-out; with it too wide, a question about claims also gets a
 * confident-sounding paragraph from the HR agent. Pulled out as a pure function
 * because it is the part most likely to be tuned, and a wrong bound here is
 * invisible -- a question simply stops reaching an agent that could answer it.
 *
 * @param {Array<{best_similarity: number}>} routed ranked, best first
 * @returns {Array} the same objects, still ranked
 */
export function selectContributors(routed, { maxAgents = 3, spread = 0.12 } = {}) {
  if (!routed.length) return [];
  const leader = routed[0].best_similarity;
  return routed.filter((r) => r.best_similarity >= leader - spread).slice(0, maxAgents);
}

/**
 * How several grounded answers read as one.
 *
 * One contributor reads as a plain answer; several are attributed, because a
 * reader needs to know which body of data each half came from.
 */
export function composeTeamAnswer(contributions) {
  return contributions.length === 1
    ? contributions[0].answer
    : contributions.map((c) => `**${c.agent.name}**\n${c.answer}`).join('\n\n');
}

/**
 * Ask whichever agents can actually answer.
 *
 * @returns {Promise<{answer, grounded, contributions, consulted, routed}>}
 */
export async function askTeam({ question, maxAgents = 3, spread = 0.12 }) {
  const routed = await route({ question, limit: maxAgents * 2 });

  if (!routed.length) {
    return {
      answer: `${REFUSAL} No agent holds data on that.`,
      grounded: false, contributions: [], consulted: [], routed: [],
    };
  }

  const chosen = selectContributors(routed, { maxAgents, spread });

  const supabase = db();
  const contributions = [];

  for (const candidate of chosen) {
    const agent = unwrap(
      await supabase.from('agents').select('*').eq('id', candidate.agent_id).single(),
      'loading the agent',
    );
    /* Each agent runs the full ask() path -- its own gate, its own prompt
       contract, its own citation audit. The router cannot bypass any of it. */
    const result = await ask({ agent, question });
    if (result.grounded) {
      contributions.push({
        agent: { slug: agent.slug, name: agent.name },
        answer: result.answer,
        citations: result.citations,
        interactionId: result.interactionId,
        confidence: candidate.best_similarity,
      });
    }
  }

  if (!contributions.length) {
    return {
      answer: REFUSAL,
      grounded: false,
      contributions: [],
      consulted: chosen.map((c) => c.slug),
      routed,
    };
  }

  const answer = composeTeamAnswer(contributions);

  return {
    answer,
    grounded: true,
    contributions,
    consulted: chosen.map((c) => c.slug),
    routed,
  };
}
