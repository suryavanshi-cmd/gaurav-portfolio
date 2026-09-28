/*
  Blog posts.

  Bodies are block arrays rather than markdown, so the article renderer is a
  handful of cases and the page ships no parser. Block types: h2, p, ul, ol,
  code, quote, table. `points` is the "In short" list at the top of a post.

  Written to be short and plain: short sentences, common words, one idea per
  paragraph. Slugs never change — they are the URLs other sites link to.
*/

import { engineeringPosts } from './engineeringPosts.js';

const llmPosts = [
  {
    slug: 'false-positives-kill-guardrails',
    title: 'Why blocking too much breaks an AI guardrail',
    date: '2026-07-14',
    tags: ['LLM testing', 'Guardrails', 'Security'],
    summary:
      'A guardrail can fail two ways: it lets an attack in, or it blocks a normal question. The second one is quiet — and it is the one that gets guardrails switched off.',
    points: [
      'Measure two numbers: attacks caught (recall) and correct blocks (precision).',
      'Test with normal questions that look risky — not only with attacks.',
      'Keyword lists fail: attackers change their words, real users can’t.',
      'Check retrieved documents too. Attacks hide there.',
    ],
    body: [
      { type: 'h2', text: 'Two ways to fail' },
      { type: 'p', text: 'Miss an attack, and something bad happens once. It is loud. Everyone agrees it must not happen again, so the filter gets stricter.' },
      { type: 'p', text: 'Block a normal question, and nothing visible happens. The user rewords it. Then it happens to someone else. A few weeks later people say the assistant is annoying and stop using it — or find a way around the filter. The guardrail was not beaten. It was ignored.' },

      { type: 'h2', text: 'Measure both' },
      {
        type: 'table',
        head: ['', 'Blocked', 'Allowed'],
        rows: [
          ['Really an attack', 'Caught ✓', 'Breach ✗'],
          ['Really a normal question', 'False alarm ✗', 'Fine ✓'],
        ],
      },
      { type: 'p', text: 'Recall is how many attacks you caught. Precision is how many of your blocks were right. A filter that blocks everything has perfect recall and is useless — which is why you need precision too.' },

      { type: 'h2', text: 'Test with “hard” normal questions' },
      { type: 'p', text: 'Attacks are easy to collect. The hard part is collecting normal questions that look dangerous:' },
      {
        type: 'ul',
        items: [
          '“Explain our PII redaction policy.” — mentions PII, but it asks how a control works.',
          '“Why did the system ignore the previous update?” — contains “ignore” and “previous”, the words of a classic attack.',
          '“What is the admin override process for a stuck payment?” — a real business process.',
        ],
      },
      { type: 'p', text: 'If your test set has none of these, your precision number means nothing.' },

      { type: 'h2', text: 'Why keyword lists fail' },
      { type: 'p', text: 'An attacker can reword an attack forever. A real user cannot reword their job — they must use your domain’s words. So over time a keyword list blocks more real users while attackers slip past.' },

      { type: 'h2', text: 'Attacks hide in documents too' },
      { type: 'p', text: 'In a RAG app, the attack can sit inside a retrieved document, not in what the user typed. Treat everything that goes into the prompt as untrusted — your own documents and tool results included.' },

      { type: 'h2', text: 'Blocking is not the only answer' },
      {
        type: 'ul',
        items: [
          'Answer, but turn off tools for that turn. Most attacks want an action, not a reply.',
          'Mark text from documents as data to quote, not instructions to follow.',
          'Ask first: “This sends data outside the system — did you mean that?”',
          'Hard-block only the truly dangerous requests.',
        ],
      },
      { type: 'p', text: 'More kinds of answer means fewer hard block-or-allow guesses — and fewer blocked users.' },
    ],
  },

  {
    slug: 'testing-llm-features-in-ci',
    title: 'How to test an LLM feature in CI',
    date: '2026-06-02',
    tags: ['LLM testing', 'CI/CD', 'Evaluation'],
    summary:
      'LLM answers change wording on every run, so normal tests break. Check structure, facts and meaning in layers, and pass on a percentage — that gives you a real gate.',
    points: [
      'Layer 1, structure: valid JSON with the right fields. Free, and catches most breaks.',
      'Layer 2, facts: what the answer must contain, and must never contain.',
      'Layer 3, meaning: a separate model returns a label with a reason — not a score.',
      'Pass on a percentage, but some cases must always pass.',
    ],
    body: [
      { type: 'h2', text: 'The problem' },
      { type: 'p', text: 'Run the same prompt twice and you get two different sentences. So assertEquals is useless, and many teams ship LLM features with no tests at all. The wording changes — but the facts you care about should not.' },

      { type: 'h2', text: 'Test in three layers' },
      {
        type: 'table',
        head: ['Layer', 'Checks', 'Cost'],
        rows: [
          ['Structure', 'Valid JSON, required fields, allowed values', 'Free'],
          ['Facts', 'Must contain / must never contain', 'Free'],
          ['Meaning', 'Tone, completeness, does it answer the question', 'One model call'],
        ],
      },

      { type: 'h2', text: '1. Structure' },
      { type: 'p', text: 'Ask for JSON, then check it with code. The model saying “here is JSON” is not the same as valid JSON — a stray sentence before the opening brace is the most common break.' },
      {
        type: 'code',
        lang: 'javascript',
        code: `const answer = JSON.parse(await runFeature(testCase.input));
expect(validate(answer)).toBe(true);          // JSON Schema
expect(['approve', 'reject', 'escalate']).toContain(answer.decision);`,
      },

      { type: 'h2', text: '2. Facts' },
      { type: 'p', text: 'For each test case, write down what the answer must contain and what it must never contain. The “never” list matters more: it catches the moment the model starts citing a clause that exists — just not the right one.' },

      { type: 'h2', text: '3. Meaning' },
      { type: 'p', text: 'For things code cannot check, use a second model as a judge. Keep it separate: it sees only the question, the answer and the evidence. And ask for a label — SUPPORTED or UNSUPPORTED — with one sentence of reason. A score out of ten changes every run; a label is steady.' },

      { type: 'h2', text: 'Pass on a percentage' },
      { type: 'p', text: 'LLMs sometimes fail a case they usually pass. If one red case fails the build, people start ignoring the tests. So pass the build when, say, 95% of cases pass — but structure failures and cases marked critical must always pass.' },

      { type: 'h2', text: 'Keep the test set honest' },
      {
        type: 'ul',
        items: [
          'Write expected answers by hand or from the source — never by copying a run.',
          'Delete cases nobody would bother to fix.',
          'Turn every real bug from production into a new test case.',
          'Record tokens and time in the same run, so a costly prompt change shows up too.',
        ],
      },
    ],
  },

  {
    slug: 'bad-rag-answers-are-retrieval-failures',
    title: 'When RAG gives a bad answer, check the search first',
    date: '2026-04-21',
    tags: ['RAG', 'Search', 'LLM testing'],
    summary:
      'When a RAG assistant answers badly, people blame the model and rewrite the prompt. Usually the right document never reached the model at all.',
    points: [
      'Test the search step and the answer step separately.',
      'Measure recall@k: is the right document in the top k results?',
      'Weak at top 5 but fine at top 20 → add a reranker. Weak at both → fix chunking.',
      'A right answer from bad search is luck, not success.',
    ],
    body: [
      { type: 'h2', text: 'Two parts, tested separately' },
      { type: 'p', text: 'RAG is two steps: search finds documents, then the model writes an answer from them. If you only test the final answer, you cannot tell which step failed.' },
      {
        type: 'table',
        head: ['Search right?', 'Answer right?', 'What it means'],
        rows: [
          ['Yes', 'Yes', 'Working.'],
          ['Yes', 'No', 'A prompt or model problem. Now editing the prompt helps.'],
          ['No', 'No', 'A search problem. Prompt changes will not help.'],
          ['No', 'Yes', 'A lucky guess from the model’s memory. Dangerous.'],
        ],
      },

      { type: 'h2', text: 'Measure recall@k' },
      { type: 'p', text: 'For each test question, note which document has the answer. Then check whether it appears in the top k search results.' },
      {
        type: 'code',
        lang: 'javascript',
        code: `let found = 0;
for (const q of questions) {
  const ids = (await search(q.text, k)).map((doc) => doc.id);
  if (q.answerIds.some((id) => ids.includes(id))) found += 1;
}
const recallAtK = found / questions.length;`,
      },
      { type: 'p', text: 'Try k = 5 and k = 20. Good at 20 but poor at 5 means the right document is found but ranked low — add a reranker. Poor at both means it is not found at all — look at chunking and indexing.' },

      { type: 'h2', text: 'Build honest test questions' },
      {
        type: 'ul',
        items: [
          'Use real questions from users, tickets or search logs.',
          'Mark the right document by hand.',
          'Never use “whatever the search returns today” as the answer key — then the test only checks that search agrees with itself.',
        ],
      },

      { type: 'h2', text: 'Chunking matters most' },
      {
        type: 'ul',
        items: [
          'Too small, and a chunk has no context — a table row with no header.',
          'Too big, and the one useful sentence gets lost in the rest.',
          'Split on headings and sections, not a fixed number of characters.',
          'Keep the header row with every piece of a table.',
        ],
      },

      { type: 'h2', text: 'Add keyword search' },
      { type: 'p', text: 'Vector search is weak at exact codes like “CLM-2291” or “clause 4.2” — and those are what people search for. Run keyword search too, and merge the two result lists.' },

      { type: 'h2', text: 'Watch for old documents' },
      { type: 'p', text: 'An answer can match its source perfectly and still be wrong, because the source is out of date. Store a date with every chunk, prefer newer ones, and show the date next to the answer.' },
    ],
  },
];

/* Reading time from the words a reader will actually see, at 200 words a
   minute, so it can never drift from the text. */
function readingMinutes(post) {
  const text = [
    post.summary,
    ...(post.points || []),
    ...post.body.flatMap((block) => {
      if (block.type === 'ul' || block.type === 'ol') return block.items;
      if (block.type === 'table') return [...block.head, ...block.rows.flat()];
      if (block.type === 'code') return [block.code];
      return [block.text];
    }),
  ].join(' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(words / 200));
}

/* Newest first. Sorting here rather than by array position means adding a
   post is one append, in whichever file it belongs to. */
export const posts = [...llmPosts, ...engineeringPosts]
  .map((post) => ({ ...post, readingMinutes: readingMinutes(post) }))
  .sort((a, b) => b.date.localeCompare(a.date));

export const postsBySlug = Object.fromEntries(posts.map((post) => [post.slug, post]));

export { formatDate } from './format';

export const allTags = [...new Set(posts.flatMap((post) => post.tags))].sort();
