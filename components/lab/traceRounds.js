/*
  Cases for the Langfuse "trace detective" game.

  Each case is one made-up support app trace, drawn the way Langfuse draws
  them: a timeline of nested steps (spans), with model calls (generations),
  tool calls, retrieval, scores and error levels. The player reads the
  complaint and taps the step that caused it.

  `culprit` is the right answer. `close` lists steps that show the symptom but
  not the cause — picking one costs no life, it just nudges.
  Times are in milliseconds.
*/

export const TRACE_ROUNDS = [
  {
    id: 'slow',
    complaint: 'I waited 9 seconds for a simple answer.',
    who: '🙋',
    total: 9200,
    spans: [
      { id: 'embed', name: 'turn question into numbers', type: 'span', depth: 0, start: 0, dur: 120, info: [['What it does', 'Embeds the question for search']] },
      { id: 'search', name: 'search help docs', type: 'retriever', depth: 0, start: 120, dur: 7600, info: [['Docs found', '5'], ['Index', 'help-docs'], ['Time', '7.6 s']] },
      { id: 'answer', name: 'write answer', type: 'generation', depth: 0, start: 7720, dur: 1400, info: [['Model', 'small, fast model'], ['Tokens', '900 in · 120 out'], ['Cost', '$0.0003']] },
      { id: 'send', name: 'send reply', type: 'span', depth: 0, start: 9120, dur: 80, info: [['What it does', 'Returns the answer to the app']] },
    ],
    culprit: 'search',
    close: [],
    hint: 'Look at the bars, not the names. Which step used most of the 9 seconds?',
    explain: 'The search took 7.6 of the 9.2 seconds. The model only took 1.4.',
    lesson: 'Slow? Read the timeline first. The longest bar is the answer — often it is not the model.',
  },
  {
    id: 'wrong',
    complaint: 'I asked how refunds work. It told me about delivery times.',
    who: '😕',
    total: 1600,
    spans: [
      { id: 'embed', name: 'turn question into numbers', type: 'span', depth: 0, start: 0, dur: 90, info: [['What it does', 'Embeds the question for search']] },
      { id: 'search', name: 'search help docs', type: 'retriever', depth: 0, start: 90, dur: 310, info: [['Question', '“How do refunds work?”'], ['Docs found', '“Delivery takes 3–5 days” · “Track your order” · “Delivery charges”']] },
      { id: 'answer', name: 'write answer', type: 'generation', depth: 0, start: 400, dur: 1150, info: [['Output', '“Your order arrives in 3–5 days.”'], ['Judge: sticks to the docs?', '0.95 — yes']] },
      { id: 'send', name: 'send reply', type: 'span', depth: 0, start: 1550, dur: 50, info: [['What it does', 'Returns the answer to the app']] },
    ],
    culprit: 'search',
    close: ['answer'],
    hint: 'The model scored 0.95 for sticking to its documents. So what documents did it get?',
    explain: 'The search handed the model three delivery pages and no refund page. The model faithfully summarised what it was given.',
    lesson: 'A wrong answer is often a search problem. Check what the retriever returned before changing the prompt.',
  },
  {
    id: 'cost',
    complaint: 'Our AI bill doubled this week.',
    who: '💸',
    total: 2400,
    spans: [
      { id: 'history', name: 'load chat history', type: 'span', depth: 0, start: 0, dur: 60, info: [['Messages loaded', '142 — the whole chat, every time'], ['Changed', 'Last week: was the last 10']] },
      { id: 'answer', name: 'write answer', type: 'generation', depth: 0, start: 60, dur: 2250, info: [['Tokens', '18,400 in · 90 out'], ['Cost', '$0.028 (was $0.002)']] },
      { id: 'send', name: 'send reply', type: 'span', depth: 0, start: 2310, dur: 90, info: [['What it does', 'Returns the answer to the app']] },
    ],
    culprit: 'history',
    close: ['answer'],
    hint: 'The model call is where the cost shows up. But why is its input 18,400 tokens?',
    explain: 'Last week the history step started sending all 142 old messages with every question, instead of the last 10.',
    lesson: 'Langfuse shows tokens and cost on every model call. When cost jumps, find what made the input grow.',
  },
  {
    id: 'language',
    complaint: 'मी मराठीत विचारलं, पण उत्तर इंग्रजीत आलं. (I asked in Marathi, it answered in English.)',
    who: '🗣️',
    total: 1500,
    spans: [
      { id: 'detect', name: 'detect language', type: 'span', depth: 0, start: 0, dur: 40, info: [['Result', 'mr — Marathi ✓']] },
      { id: 'answer', name: 'write answer', type: 'generation', depth: 0, start: 40, dur: 1400, info: [['Prompt', 'support-answer · version 7 (changed yesterday)'], ['What v7 removed', '“Reply in the user’s language.”'], ['Output', 'English']] },
      { id: 'send', name: 'send reply', type: 'span', depth: 0, start: 1440, dur: 60, info: [['What it does', 'Returns the answer to the app']] },
    ],
    culprit: 'answer',
    close: [],
    hint: 'The language was detected correctly. Which step uses a prompt that changed yesterday?',
    explain: 'Prompt version 7 dropped the line “Reply in the user’s language.” Detection worked; the prompt threw it away.',
    lesson: 'Langfuse links each model call to the prompt version it used — so you can see which change broke things, and roll back.',
  },
  {
    id: 'stuck',
    complaint: 'The bot kept saying “let me check…” and then gave up.',
    who: '🔁',
    total: 10200,
    spans: [
      { id: 'agent1', name: 'agent: decide', type: 'generation', depth: 0, start: 0, dur: 300, info: [['Decided', 'Call get_order']] },
      { id: 'tool1', name: 'get_order', type: 'tool', depth: 1, start: 300, dur: 3000, level: 'error', info: [['Level', 'ERROR'], ['Status', 'Timed out after 3 s']] },
      { id: 'agent2', name: 'agent: decide', type: 'generation', depth: 0, start: 3300, dur: 280, info: [['Decided', 'Try get_order again']] },
      { id: 'tool2', name: 'get_order', type: 'tool', depth: 1, start: 3580, dur: 3000, level: 'error', info: [['Level', 'ERROR'], ['Status', 'Timed out after 3 s']] },
      { id: 'agent3', name: 'agent: decide', type: 'generation', depth: 0, start: 6580, dur: 290, info: [['Decided', 'Try get_order again']] },
      { id: 'tool3', name: 'get_order', type: 'tool', depth: 1, start: 6870, dur: 3000, level: 'error', info: [['Level', 'ERROR'], ['Status', 'Timed out after 3 s']] },
      { id: 'agent4', name: 'agent: give up', type: 'generation', depth: 0, start: 9870, dur: 330, info: [['Output', '“Sorry, I couldn’t find your order.”']] },
    ],
    culprit: 'tool1',
    accept: ['tool2', 'tool3'],
    close: ['agent1', 'agent2', 'agent3', 'agent4'],
    hint: 'Look for the steps marked in red.',
    explain: 'Every call to get_order timed out. The agent did the sensible thing — it retried, then gave up.',
    lesson: 'Langfuse marks failed steps with level ERROR, so a broken tool stands out in a long agent run.',
  },
  {
    id: 'thumbs',
    complaint: 'Since Monday, users give 👎 to most answers.',
    who: '👎',
    total: 1900,
    spans: [
      { id: 'search', name: 'search help docs', type: 'retriever', depth: 0, start: 0, dur: 280, info: [['Docs found', '3, all on topic']] },
      { id: 'answer', name: 'write answer', type: 'generation', depth: 0, start: 280, dur: 1350, info: [['Output', 'A full, correct 6-line answer'], ['Judge: helpful?', '0.9 before the next step']] },
      { id: 'guard', name: 'safety filter', type: 'span', depth: 0, start: 1630, dur: 30, info: [['Added', 'Monday'], ['Setting', 'Max length: 50 characters'], ['Output', '“To get a refund, open your orders and tap R…”']] },
      { id: 'send', name: 'send reply', type: 'span', depth: 0, start: 1660, dur: 240, info: [['Scores', 'User: 👎 · Judge on final reply: 0.3']] },
    ],
    culprit: 'guard',
    close: ['answer', 'send'],
    hint: 'The answer was good when it was written. What happened to it after that — and what changed on Monday?',
    explain: 'A new safety filter added on Monday cuts every reply to 50 characters. The answer was fine until then.',
    lesson: 'Scores (user feedback, judge scores) tell you something is wrong. The steps in the trace tell you where.',
  },
];
