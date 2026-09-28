/*
  Levels for the LangGraph game.

  Each level is a small graph in the LangGraph style: nodes are steps that
  read the shared state and return an update, plus a route name. Fixed edges
  always go the same way; "slots" are the conditional edges the player wires.

  Nothing here calls a model — every node is a few lines of plain code, so the
  game is about the graph (edges, loops, limits, pauses), which is exactly the
  part LangGraph adds.

  test.check(state) returns null when the test passes, or a plain sentence
  saying what went wrong.
*/

export const GRAPH_LEVELS = [
  {
    id: 'first-graph',
    title: 'Your first graph',
    goal: 'The bot should reply once, then stop.',
    hint: 'After the bot replies, the graph has to go somewhere. END means “stop”.',
    lesson: 'A graph is steps (nodes) joined by arrows (edges). The state — here, the chat messages — is passed along from step to step. END stops the run.',
    limit: 6,
    entry: 'chatbot',
    nodes: {
      chatbot: {
        label: 'chatbot',
        pos: [160, 112],
        run: (s) => ({
          update: { answer: 'Hello! Nice to meet you.', replies: (s.replies || 0) + 1 },
          route: 'next',
          log: 'wrote a reply',
        }),
      },
    },
    points: { START: [160, 32], END: [160, 196] },
    height: 228,
    edges: {},
    slots: [
      { from: 'chatbot', route: 'next', when: 'after it replies', options: ['chatbot', 'END'] },
    ],
    tests: [
      {
        name: 'Say “Hi”',
        input: 'Hi',
        check: (s) => (s.replies === 1 ? null : `It replied ${s.replies} times.`),
      },
    ],
  },
  {
    id: 'tool-loop',
    title: 'Give it a tool',
    goal: 'Answer “What’s the weather in Pune?” using the weather tool — and still answer “Say hi” without it.',
    hint: 'The agent asks for the tool. The tool’s answer has to go back to the agent, so it can write the reply.',
    lesson: 'A conditional edge picks the next step from what just happened. Agent → tool → agent is a loop, and loops are what make agents work.',
    limit: 8,
    entry: 'agent',
    nodes: {
      agent: {
        label: 'agent',
        pos: [96, 116],
        run: (s) => {
          if (s.toolResult) {
            return { update: { answer: `It’s ${s.toolResult} in Pune.` }, route: 'answer', log: 'read the tool result and answered' };
          }
          if (/weather/i.test(s.input)) {
            return { update: { toolCalls: (s.toolCalls || 0) + 1 }, route: 'tool', log: 'asked for the weather tool' };
          }
          return { update: { answer: 'Hi! How can I help?' }, route: 'answer', log: 'answered without a tool' };
        },
      },
      tools: {
        label: 'weather tool',
        pos: [236, 116],
        run: () => ({ update: { toolResult: '31°C and sunny' }, route: 'next', log: 'returned “31°C and sunny”' }),
      },
    },
    points: { START: [96, 32], END: [96, 206] },
    height: 238,
    edges: {},
    slots: [
      { from: 'agent', route: 'tool', when: 'if it asks for a tool', options: ['agent', 'tools', 'END'] },
      { from: 'agent', route: 'answer', when: 'if it has the answer', options: ['tools', 'END', 'agent'] },
      { from: 'tools', route: 'next', when: 'after the tool runs', options: ['END', 'agent'] },
    ],
    tests: [
      {
        name: 'What’s the weather in Pune?',
        input: 'What’s the weather in Pune?',
        check: (s) => {
          if (!s.answer) return 'It stopped without an answer — the tool result never got back to the agent.';
          return /31°C/.test(s.answer) ? null : 'It answered without the weather.';
        },
      },
      {
        name: 'Say hi',
        input: 'Say hi',
        check: (s) => {
          if (!s.answer) return 'It stopped without an answer.';
          return s.toolCalls ? 'It called a tool it did not need.' : null;
        },
      },
    ],
  },
  {
    id: 'retry-limit',
    title: 'Don’t loop forever',
    goal: 'Retry a weak draft — but if it’s still bad after 3 tries, hand it to a person instead of looping.',
    hint: 'Three routes leave the checker. A good draft is done. A bad one goes back to the writer. After 3 bad tries, a person takes over.',
    lesson: 'Loops need a way out. LangGraph stops any run that goes past its recursion limit with an error, so give the loop its own exit before that happens.',
    limit: 12,
    entry: 'writer',
    nodes: {
      writer: {
        label: 'writer',
        pos: [96, 108],
        run: (s, t) => {
          const tries = (s.tries || 0) + 1;
          const good = t.goodOn ? tries >= t.goodOn : false;
          return { update: { tries, good }, route: 'next', log: `wrote draft ${tries}` };
        },
      },
      checker: {
        label: 'checker',
        pos: [96, 196],
        run: (s) => {
          if (s.good) return { update: { answer: `Draft ${s.tries}` }, route: 'pass', log: `draft ${s.tries} is good` };
          if (s.tries >= 3) return { update: {}, route: 'give_up', log: `still bad after ${s.tries} tries` };
          return { update: {}, route: 'retry', log: `draft ${s.tries} is weak` };
        },
      },
      human: {
        label: 'person',
        pos: [236, 196],
        run: () => ({ update: { answer: 'Written by a person', byHuman: true }, route: 'next', log: 'a person wrote it' }),
      },
    },
    points: { START: [96, 30], END: [96, 282] },
    height: 312,
    edges: { writer: 'checker', human: 'END' },
    slots: [
      { from: 'checker', route: 'pass', when: 'if the draft is good', options: ['writer', 'END', 'human'] },
      { from: 'checker', route: 'retry', when: 'if the draft is weak', options: ['END', 'human', 'writer'] },
      { from: 'checker', route: 'give_up', when: 'if 3 tries failed', options: ['writer', 'human', 'END'] },
    ],
    tests: [
      {
        name: 'A tagline for a farm stay',
        input: 'A tagline for a farm stay',
        goodOn: 3,
        check: (s) => {
          if (!s.answer) return 'It stopped with no answer — the user got nothing.';
          if (s.byHuman) return 'A person wrote it, but the writer would have got it on try 3.';
          return null;
        },
      },
      {
        name: 'A 3-word poem that rhymes with “orange”',
        input: 'A 3-word poem that rhymes with orange',
        goodOn: 0,
        check: (s) => (s.answer ? null : 'It stopped with no answer — the user got nothing.'),
      },
    ],
  },
  {
    id: 'human-approval',
    title: 'Ask a person first',
    goal: 'Pay small refunds at once. Big ones (over ₹10,000) wait for a manager — and only get paid if the manager says yes.',
    hint: 'Small goes straight to the refund. Large goes to the manager. The manager’s “no” must never reach the refund.',
    lesson: 'A graph can pause for a person. LangGraph saves the state at that point (a checkpoint), waits, then carries on from exactly there — hours later if needed.',
    limit: 10,
    entry: 'classify',
    nodes: {
      classify: {
        label: 'check amount',
        pos: [160, 104],
        run: (s) => (s.amount <= 10000
          ? { update: {}, route: 'small', log: `₹${s.amount.toLocaleString('en-IN')} is small` }
          : { update: {}, route: 'large', log: `₹${s.amount.toLocaleString('en-IN')} is large` }),
      },
      refund: {
        label: 'pay refund',
        pos: [70, 192],
        run: (s) => ({
          update: { refunded: true, answer: `Refunded ₹${s.amount.toLocaleString('en-IN')}` },
          route: 'next',
          log: `paid ₹${s.amount.toLocaleString('en-IN')}`,
        }),
      },
      human: {
        label: 'manager',
        pos: [250, 192],
        run: (s) => (s.amount <= 20000
          ? { update: { humanSeen: true }, route: 'approve', log: 'paused, then the manager said yes', pause: true }
          : { update: { humanSeen: true, answer: 'A manager said no' }, route: 'reject', log: 'paused, then the manager said no', pause: true }),
      },
    },
    points: { START: [160, 28], END: [160, 282] },
    height: 312,
    edges: { refund: 'END' },
    slots: [
      { from: 'classify', route: 'small', when: 'if it is ₹10,000 or less', options: ['human', 'END', 'refund'] },
      { from: 'classify', route: 'large', when: 'if it is over ₹10,000', options: ['refund', 'human', 'END'] },
      { from: 'human', route: 'approve', when: 'if the manager says yes', options: ['END', 'refund'] },
      { from: 'human', route: 'reject', when: 'if the manager says no', options: ['refund', 'END'] },
    ],
    tests: [
      {
        name: 'Refund ₹2,000',
        input: 'Refund ₹2,000',
        amount: 2000,
        check: (s) => {
          if (!s.refunded) return 'A small refund was never paid.';
          return s.humanSeen ? 'It worked, but a manager had to stop and check a ₹2,000 refund.' : null;
        },
      },
      {
        name: 'Refund ₹15,000',
        input: 'Refund ₹15,000',
        amount: 15000,
        check: (s) => {
          if (!s.humanSeen) return 'Paid ₹15,000 with nobody checking.';
          return s.refunded ? null : 'The manager said yes, but it was never paid.';
        },
      },
      {
        name: 'Refund ₹50,000',
        input: 'Refund ₹50,000',
        amount: 50000,
        check: (s) => {
          if (!s.humanSeen) return 'Paid ₹50,000 with nobody checking.';
          return s.refunded ? 'The manager said no — and it was paid anyway.' : null;
        },
      },
    ],
  },
];

/* Runs one test through the player's wiring. Returns every step taken, the
   final state, and the first problem found (or null). */
export function runGraph(level, wiring, test) {
  let state = { input: test.input, amount: test.amount };
  const path = [{ node: 'START' }];
  let current = level.entry;

  for (let steps = 0; ; steps += 1) {
    if (current === 'END') {
      path.push({ node: 'END' });
      return { path, state, error: test.check(state) };
    }
    if (steps >= level.limit) {
      return {
        path,
        state,
        error: `Stopped at the recursion limit (${level.limit} steps) — it was going round in a loop.`,
        loop: true,
      };
    }
    const node = level.nodes[current];
    const out = node.run(state, test);
    state = { ...state, ...out.update };
    path.push({ node: current, log: out.log, pause: out.pause });
    const next = level.edges[current] ?? wiring[`${current}:${out.route}`];
    if (!next) return { path, state, error: `Nothing connected after “${node.label}”.` };
    current = next;
  }
}
