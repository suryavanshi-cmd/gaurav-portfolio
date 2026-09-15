import { pipeline } from '@huggingface/transformers';
import { config } from './config.js';

let extractor = null;
let loading = null;

/* Loaded once per process and reused. On a cold start the model is read from
   ~/.cache/huggingface (or downloaded, ~23MB, the first time ever); after that
   it is a local file read. Concurrent callers share one load rather than
   racing to instantiate several copies of the weights. */
async function getExtractor() {
  if (extractor) return extractor;
  if (!loading) {
    loading = pipeline('feature-extraction', config.embeddings.model)
      .then((p) => { extractor = p; return p; })
      .catch((err) => { loading = null; throw err; });
  }
  return loading;
}

/** Warm the model before serving traffic, so the first question is not slow. */
export async function warmup() {
  await getExtractor();
}

/**
 * Mean-pooled, L2-normalised sentence embeddings.
 *
 * Normalising here means cosine distance and inner product agree, so pgvector's
 * `<=>` is the only operator the SQL layer needs to know about.
 *
 * @param {string[]} texts
 * @returns {Promise<number[][]>} one 384-float vector per input, in order
 */
export async function embed(texts) {
  const inputs = (Array.isArray(texts) ? texts : [texts]).map((t) => String(t ?? '').trim() || ' ');
  if (!inputs.length) return [];

  const extract = await getExtractor();
  const out = [];
  /* Batched because the model holds the whole batch in memory at once: a
     10,000-row spreadsheet embedded in one call will exhaust the heap on a
     laptop, while batches of 32 stay flat. */
  for (let i = 0; i < inputs.length; i += config.embeddings.batchSize) {
    const batch = inputs.slice(i, i + config.embeddings.batchSize);
    const tensor = await extract(batch, { pooling: 'mean', normalize: true });
    out.push(...tensor.tolist());
  }
  return out;
}

/** Convenience for the single-query path. */
export async function embedOne(text) {
  const [vector] = await embed([text]);
  return vector;
}

/** Both vectors are already normalised, so the dot product is the cosine. */
export function cosine(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) sum += a[i] * b[i];
  return sum;
}
