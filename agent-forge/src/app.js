import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { ingestBuffer, forgetDocument } from './ingest/pipeline.js';
import { SUPPORTED } from './ingest/parse.js';
import { createAgent, getAgent, listAgents, updateAgent, agentStats } from './agent/registry.js';
import { ask } from './agent/answer.js';
import { recordFeedback, teach, listLearned, unlearn, knowledgeGaps } from './agent/learn.js';
import { db, unwrap } from './db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(here, '..', 'web')));

/* Memory storage: files are parsed and discarded in the same request, so
   writing them to disk first would only add a cleanup problem. */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.server.maxUploadBytes },
});

/** Every handler is the same shape: do the work, or report why it failed. */
const route = (handler) => async (req, res) => {
  try {
    res.json(await handler(req));
  } catch (err) {
    /* A parse failure is the user's file being unreadable, not a server fault,
       and the message explains what to do about it. */
    const status = /^(No agent|Cannot read|This PDF|This file|Nothing readable|\.doc|\.ppt)/.test(err.message) ? 400 : 500;
    if (status === 500) console.error(err);
    res.status(status).json({ error: err.message });
  }
};

app.get('/api/health', route(async () => ({
  ok: true,
  provider: config.llm.provider,
  embeddingModel: config.embeddings.model,
  supported: SUPPORTED,
})));

/* ------------------------------------------------------------------ agents */

app.get('/api/agents', route(async () => ({ agents: await listAgents() })));

app.post('/api/agents', route(async (req) => {
  const { slug, name, description, persona } = req.body;
  if (!slug || !name) throw new Error('slug and name are required');
  return { agent: await createAgent({ slug, name, description, persona }) };
}));

app.get('/api/agents/:slug', route(async (req) => {
  const agent = await getAgent(req.params.slug);
  return { agent, stats: await agentStats(agent.id) };
}));

app.patch('/api/agents/:slug', route(async (req) => {
  const agent = await getAgent(req.params.slug);
  return { agent: await updateAgent(agent.id, req.body) };
}));

/* --------------------------------------------------------------- knowledge */

app.post('/api/agents/:slug/documents', upload.single('file'), route(async (req) => {
  const agent = await getAgent(req.params.slug);
  if (!req.file) throw new Error('No file was uploaded.');
  return ingestBuffer({
    agentId: agent.id,
    buffer: req.file.buffer,
    filename: req.file.originalname,
  });
}));

app.get('/api/agents/:slug/documents', route(async (req) => {
  const agent = await getAgent(req.params.slug);
  const documents = unwrap(
    await db().from('documents')
      .select('id, title, source_kind, bytes, chunk_count, metadata, created_at')
      .eq('agent_id', agent.id).order('created_at', { ascending: false }),
    'listing documents',
  );
  return { documents };
}));

app.delete('/api/agents/:slug/documents/:id', route(async (req) => {
  const agent = await getAgent(req.params.slug);
  await forgetDocument({ agentId: agent.id, documentId: req.params.id });
  return { forgotten: req.params.id };
}));

/* ---------------------------------------------------------------- asking */

app.post('/api/agents/:slug/ask', route(async (req) => {
  const agent = await getAgent(req.params.slug);
  const question = String(req.body.question || '').trim();
  if (!question) throw new Error('A question is required.');
  return ask({ agent, question });
}));

/* -------------------------------------------------------------- learning */

app.post('/api/agents/:slug/feedback', route(async (req) => {
  const agent = await getAgent(req.params.slug);
  const { interactionId, verdict, correction } = req.body;
  if (!['up', 'down'].includes(verdict)) throw new Error('verdict must be "up" or "down".');
  return recordFeedback({ agentId: agent.id, interactionId, verdict, correction });
}));

app.post('/api/agents/:slug/teach', route(async (req) => {
  const agent = await getAgent(req.params.slug);
  const { question, answer, kind } = req.body;
  if (!answer) throw new Error('answer is required.');
  return { id: await teach({ agentId: agent.id, question, answer, kind }) };
}));

app.get('/api/agents/:slug/learned', route(async (req) => {
  const agent = await getAgent(req.params.slug);
  return { learned: await listLearned(agent.id) };
}));

app.delete('/api/agents/:slug/learned/:id', route(async (req) => {
  const agent = await getAgent(req.params.slug);
  await unlearn({ agentId: agent.id, factId: Number(req.params.id) });
  return { unlearned: req.params.id };
}));

app.get('/api/agents/:slug/gaps', route(async (req) => {
  const agent = await getAgent(req.params.slug);
  return { gaps: await knowledgeGaps(agent.id) };
}));

export { app };
