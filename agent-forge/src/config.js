import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`);
  return value;
}

export const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    /* The service role key, not the publishable one. Every table has RLS on
       with no permissive policy, so a publishable key reads nothing at all --
       that is deliberate. The grounding rules only hold if retrieval goes
       through this server, so the browser is never given database access. */
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    get client() { return { url: required('SUPABASE_URL'), key: required('SUPABASE_SERVICE_ROLE_KEY') }; },
  },

  embeddings: {
    /* all-MiniLM-L6-v2: 384 dimensions, ~23MB, runs on CPU in a few
       milliseconds per chunk. Downloaded once to ~/.cache/huggingface and then
       entirely offline. Changing this model means changing the vector(384)
       column and re-embedding everything, so it is pinned here rather than
       being a casual env var. */
    model: process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2',
    dimensions: 384,
    batchSize: Number(process.env.EMBEDDING_BATCH_SIZE || 32),
  },

  llm: {
    /* extractive | ollama | anthropic | openai
       `extractive` is the default on purpose: it returns the retrieved
       passages themselves, so it cannot hallucinate and costs nothing. The
       generative providers are an upgrade in fluency, not in truthfulness. */
    provider: process.env.LLM_PROVIDER || 'extractive',
    model: process.env.LLM_MODEL || '',
    apiKey: process.env.LLM_API_KEY || '',
    baseUrl: process.env.LLM_BASE_URL || '',
    maxTokens: Number(process.env.LLM_MAX_TOKENS || 700),
    temperature: Number(process.env.LLM_TEMPERATURE || 0),
  },

  retrieval: {
    /* How many chunks are pulled from each of the two searches before fusion.
       Larger pools cost almost nothing (the indexes do the work) and give RRF
       more to agree on. */
    pool: Number(process.env.RETRIEVAL_POOL || 40),
    /* A correction has to be about *this* question to fire. 0.78 cosine on
       MiniLM is roughly "a paraphrase of the same question" -- below that,
       corrections start leaking into neighbouring topics. This is question-to-
       question, a symmetric comparison, so it sits far higher than the
       question-to-passage gate in agents.min_similarity. */
    correctionThreshold: Number(process.env.CORRECTION_THRESHOLD || 0.78),
  },

  server: {
    port: Number(process.env.PORT || 3000),
    maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES || 25 * 1024 * 1024),
  },
};
