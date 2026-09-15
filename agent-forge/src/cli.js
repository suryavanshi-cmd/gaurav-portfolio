#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { ingestPath } from './ingest/pipeline.js';
import { createAgent, getAgent, listAgents, agentStats } from './agent/registry.js';
import { ask } from './agent/answer.js';
import { recordFeedback, teach, knowledgeGaps } from './agent/learn.js';
import { config } from './config.js';

/* The CLI exists so the whole system is usable before any UI is deployed --
   and so ingestion can be scripted, which is how a real corpus actually
   arrives: a folder, not a series of clicks. */

const [command, ...args] = process.argv.slice(2);

const usage = `
agent-forge -- a self-learning agent that answers only from your data

  npm run agent -- create <slug> "<name>"     make a new agent
  npm run agent -- list                        list agents and what they know
  npm run agent -- learn <slug> <path...>      teach it files or a folder
  npm run agent -- ask <slug> "<question>"     ask one question
  npm run agent -- chat <slug>                 interactive session with feedback
  npm run agent -- teach <slug> "<q>" "<a>"    teach a fact directly
  npm run agent -- gaps <slug>                 what it has been asked and could not answer
`;

/** Walk a directory, or just return the file. */
async function expand(target) {
  const stat = await fs.stat(target);
  if (!stat.isDirectory()) return [target];

  const entries = await fs.readdir(target, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    out.push(...await expand(path.join(target, entry.name)));
  }
  return out;
}

async function learn(slug, targets) {
  const agent = await getAgent(slug);
  const files = (await Promise.all(targets.map(expand))).flat();
  if (!files.length) return console.log('Nothing to ingest.');

  let learned = 0;
  let skipped = 0;
  for (const file of files) {
    process.stdout.write(`  ${path.basename(file)} ... `);
    try {
      const result = await ingestPath({ agentId: agent.id, filePath: file });
      if (result.skipped) { skipped += 1; console.log('already known'); }
      else { learned += 1; console.log(`${result.chunks} chunks (${result.kind})`); }
    } catch (err) {
      /* One unreadable file in a folder of 200 must not stop the other 199. */
      console.log(`skipped -- ${err.message}`);
    }
  }
  console.log(`\nLearned ${learned} file${learned === 1 ? '' : 's'}${skipped ? `, ${skipped} already known` : ''}.`);
}

function render(result) {
  console.log(`\n${result.answer}\n`);
  if (result.citations.length) {
    console.log('Sources:');
    for (const c of result.citations) {
      console.log(`  [${c.passage}] ${c.where || 'document'} -- ${c.excerpt.replace(/\s+/g, ' ').slice(0, 100)}...`);
    }
  }
  console.log(`\n(${result.mode}, top score ${result.topScore.toFixed(4)})`);
}

async function chat(slug) {
  const agent = await getAgent(slug);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log(`Talking to "${agent.name}". Answers come only from its data.`);
  console.log('Commands: /good  /bad  /fix <what it should have said>  /exit\n');

  let last = null;
  for (;;) {
    const line = (await rl.question('> ')).trim();
    if (!line) continue;
    if (line === '/exit') break;

    if (line.startsWith('/')) {
      if (!last) { console.log('Ask something first.\n'); continue; }
      const [cmd, ...rest] = line.split(' ');
      if (cmd === '/good') {
        await recordFeedback({ agentId: agent.id, interactionId: last.interactionId, verdict: 'up' });
        console.log('Noted -- those sources will rank higher.\n');
      } else if (cmd === '/bad') {
        await recordFeedback({ agentId: agent.id, interactionId: last.interactionId, verdict: 'down' });
        console.log('Noted -- those sources will rank lower.\n');
      } else if (cmd === '/fix') {
        const correction = rest.join(' ').trim();
        if (!correction) { console.log('Usage: /fix <the correct answer>\n'); continue; }
        await recordFeedback({ agentId: agent.id, interactionId: last.interactionId, verdict: 'down', correction });
        console.log('Learned. Ask again and it will use your correction.\n');
      } else console.log('Unknown command.\n');
      continue;
    }

    last = await ask({ agent, question: line });
    render(last);
    console.log();
  }
  rl.close();
}

try {
  switch (command) {
    case 'create': {
      const [slug, name] = args;
      if (!slug) throw new Error('Usage: create <slug> "<name>"');
      const agent = await createAgent({ slug, name: name || slug });
      console.log(`Created agent "${agent.name}" (${agent.slug}).`);
      break;
    }
    case 'list': {
      const agents = await listAgents();
      if (!agents.length) console.log('No agents yet. Create one with: npm run agent -- create <slug> "<name>"');
      for (const agent of agents) {
        const stats = await agentStats(agent.id);
        console.log(`${agent.slug.padEnd(20)} ${stats.documents} docs, ${stats.chunks} chunks, ` +
          `${stats.learned_facts} corrections, ${stats.ungrounded} unanswered`);
      }
      break;
    }
    case 'learn':
      if (args.length < 2) throw new Error('Usage: learn <slug> <path...>');
      await learn(args[0], args.slice(1));
      break;
    case 'ask': {
      const [slug, ...rest] = args;
      const agent = await getAgent(slug);
      render(await ask({ agent, question: rest.join(' ') }));
      break;
    }
    case 'chat':
      await chat(args[0]);
      break;
    case 'teach': {
      const [slug, question, answer] = args;
      const agent = await getAgent(slug);
      await teach({ agentId: agent.id, question, answer });
      console.log('Learned.');
      break;
    }
    case 'gaps': {
      const agent = await getAgent(args[0]);
      const gaps = await knowledgeGaps(agent.id);
      if (!gaps.length) { console.log('No unanswered questions yet.'); break; }
      console.log('Asked, but not answerable from the current data:\n');
      for (const gap of gaps) console.log(`  ${String(gap.count).padStart(3)}x  ${gap.question}`);
      console.log('\nUpload something covering these and the agent will answer them.');
      break;
    }
    default:
      console.log(usage);
      if (config.llm.provider === 'extractive') {
        console.log('Answer mode: extractive (no model, no cost). Set LLM_PROVIDER to change.\n');
      }
  }
  process.exit(0);
} catch (err) {
  console.error(`\n${err.message}\n`);
  process.exit(1);
}
