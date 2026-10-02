import { db, unwrap } from '../db.js';

/*
  An agent is a row, not a deployment. Adding the tenth agent costs one INSERT
  and no new infrastructure, which is the whole point of keeping agent_id on
  every table rather than giving each agent its own database.
*/

export async function createAgent({ slug, name, description = null, persona = null }) {
  return unwrap(
    await db().from('agents').insert({ slug, name, description, persona }).select('*').single(),
    'creating the agent',
  );
}

export async function getAgent(slugOrId) {
  const supabase = db();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
  const agent = unwrap(
    await supabase.from('agents').select('*').eq(isUuid ? 'id' : 'slug', slugOrId).maybeSingle(),
    'looking up the agent',
  );
  if (!agent) throw new Error(`No agent called "${slugOrId}". Create it with: npm run agent -- create ${slugOrId}`);
  return agent;
}

export async function listAgents() {
  return unwrap(await db().from('agents').select('*').order('created_at'), 'listing agents');
}

export async function updateAgent(id, patch) {
  const allowed = ['name', 'description', 'persona', 'min_similarity', 'max_context_chunks'];
  const clean = Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)));
  return unwrap(
    await db().from('agents').update({ ...clean, updated_at: new Date().toISOString() })
      .eq('id', id).select('*').single(),
    'updating the agent',
  );
}

export async function deleteAgent(id) {
  unwrap(await db().from('agents').delete().eq('id', id), 'deleting the agent');
}

/** What the agent knows, and what it has been told it got wrong. */
export async function agentStats(agentId) {
  const supabase = db();
  const counts = await Promise.all(
    ['documents', 'chunks', 'learned_facts', 'interactions'].map(async (table) => {
      const { count, error } = await supabase.from(table)
        .select('*', { count: 'exact', head: true }).eq('agent_id', agentId);
      if (error) throw new Error(`counting ${table}: ${error.message}`);
      return [table, count ?? 0];
    }),
  );

  const { count: ungrounded } = await supabase.from('interactions')
    .select('*', { count: 'exact', head: true }).eq('agent_id', agentId).eq('grounded', false);

  return { ...Object.fromEntries(counts), ungrounded: ungrounded ?? 0 };
}
