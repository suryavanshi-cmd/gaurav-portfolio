/*
  A small BM25 retriever.

  There is no embedding API in play — the assistant runs entirely in the
  browser, so a lexical index is what is actually available. BM25 rather than
  raw TF-IDF because it saturates term frequency and normalises for length,
  which matters here: the corpus mixes one-line résumé facts with multi-hundred
  word article passages, and without length normalisation the long passages win
  every query on term count alone.
*/

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'but', 'by', 'can', 'did', 'do', 'does',
  'for', 'from', 'had', 'has', 'have', 'he', 'her', 'his', 'how', 'i', 'in', 'is', 'it', 'its',
  'me', 'my', 'of', 'on', 'or', 'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they',
  'this', 'to', 'was', 'were', 'what', 'when', 'where', 'which', 'who', 'will', 'with', 'you',
  'your', 'am', 'about', 'tell', 'give', 'show', 'us', 'we', 'please',
]);

/* Domain vocabulary. A visitor asks "what tech does he use"; the corpus says
   "Java 17, TestNG, Rest-Assured". Without this the query and the document
   share no terms at all and BM25 scores zero — the classic lexical-retrieval
   miss that an embedding model would not have. */
const SYNONYMS = {
  tech: ['stack', 'technology', 'tool', 'language', 'skill'],
  stack: ['tech', 'technology', 'tool', 'skill'],
  skill: ['tech', 'stack', 'strength', 'tool'],
  experience: ['year', 'role', 'work', 'job', 'career', 'background'],
  background: ['experience', 'education', 'degree', 'career'],
  job: ['role', 'work', 'experience', 'position'],
  work: ['role', 'job', 'experience', 'build'],
  contact: ['email', 'reach', 'hire', 'touch', 'message'],
  hire: ['contact', 'available', 'role', 'open', 'email'],
  available: ['open', 'hire', 'looking', 'role'],
  study: ['education', 'degree', 'college', 'university'],
  education: ['degree', 'college', 'university', 'study', 'cgpa'],
  project: ['built', 'build', 'made', 'shipped'],
  write: ['writing', 'article', 'post', 'blog'],
  blog: ['article', 'post', 'writing'],
  ai: ['llm', 'ml', 'machine', 'model', 'genai'],
  llm: ['ai', 'model', 'gpt', 'language'],
  ml: ['ai', 'machine', 'learning', 'model'],
  testing: ['test', 'qa', 'automation', 'sdet'],
  test: ['testing', 'qa', 'automation', 'sdet'],
  rag: ['retrieval', 'grounding', 'embedding', 'vector'],
  backend: ['server', 'api', 'service', 'node'],
  database: ['sql', 'oracle', 'mongodb', 'db'],
  who: ['about', 'name', 'introduction'],
};

/* Deliberately conservative: enough to bind plurals and common verb endings,
   without a full stemmer that would collapse distinct terms (a Porter stemmer
   turns "testing" and "tested" into "test", but also "generic" into "gener"). */
export function stem(word) {
  if (word.length <= 3) return word;
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith('sses')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us')) return word.slice(0, -1);
  if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3);
  if (word.endsWith('ed') && word.length > 4) return word.slice(0, -2);
  /* -ation and a trailing -e, so automate / automated / automation all reduce
     to the same root. Without these three rules agreeing, a question about
     "test cases he automated" shares no term with a document that says
     "automated ... 190+ test cases" and scores zero against it. The results are
     not real words (validation -> validat), which does not matter: the same
     function runs over the query and the corpus, so only agreement matters. */
  if (word.endsWith('ation') && word.length > 6) return word.slice(0, -3);
  if (word.endsWith('e') && word.length > 4) return word.slice(0, -1);
  return word;
}

export function tokenize(text) {
  return String(text)
    .toLowerCase()
    /* Keep + # . inside a token so "c++", "java 17" and "node.js" survive. */
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .split(/[\s-]+/)
    .map((t) => t.replace(/^\.+|\.+$/g, ''))
    .filter((t) => t && t.length > 1 && !STOPWORDS.has(t))
    .map(stem);
}

function expand(tokens) {
  const out = new Set(tokens);
  for (const token of tokens) {
    for (const syn of SYNONYMS[token] || []) out.add(stem(syn));
  }
  return [...out];
}

const K1 = 1.5;
const B = 0.75;

export function buildIndex(documents) {
  const docs = documents.map((doc) => {
    const terms = tokenize(`${doc.title} ${doc.text} ${(doc.keywords || []).join(' ')}`);
    const freq = new Map();
    for (const t of terms) freq.set(t, (freq.get(t) || 0) + 1);
    return { ...doc, freq, length: terms.length };
  });

  const df = new Map();
  for (const doc of docs) for (const term of doc.freq.keys()) df.set(term, (df.get(term) || 0) + 1);

  const avgLength = docs.reduce((sum, d) => sum + d.length, 0) / (docs.length || 1);
  return { docs, df, avgLength, size: docs.length };
}

export function search(index, query, limit = 4) {
  const terms = expand(tokenize(query));
  if (!terms.length) return [];

  const { docs, df, avgLength } = index;
  const scored = docs.map((doc) => {
    let score = 0;
    const matched = [];
    for (const term of terms) {
      const f = doc.freq.get(term);
      if (!f) continue;
      /* +1 inside the log keeps the idf positive for a term present in every
         document, so a common-but-relevant word never scores negatively. */
      const idf = Math.log(1 + (docs.length - (df.get(term) || 0) + 0.5) / ((df.get(term) || 0) + 0.5));
      score += idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + B * (doc.length / avgLength))));
      matched.push(term);
    }
    /* A small nudge for documents the author marked as directly answering a
       question, so "how do I contact you" prefers the contact card over an
       article that happens to mention email. */
    if (score > 0 && doc.weight) score *= doc.weight;
    return { doc, score, matched };
  });

  return scored
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
