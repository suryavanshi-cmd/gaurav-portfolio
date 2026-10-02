import { config } from '../config.js';

/*
  Answer generation is optional and swappable.

  The default provider is `extractive`, which performs no generation at all: it
  returns the retrieved passages themselves. That is not a placeholder. A
  retrieval-only answer cannot hallucinate -- there is no model to invent
  anything -- and it costs nothing to run. The generative providers below buy
  fluency and synthesis across several passages; they do not buy correctness,
  and the grounding checks in agent/answer.js apply to all of them equally.
*/

/** @typedef {{system: string, prompt: string}} Request */

const providers = {
  /* No model, no cost, no network. */
  extractive: null,

  /* Ollama on a Mac: `brew install ollama && ollama pull llama3.2`. Free,
     private, and the whole reason this runs on a laptop without a bill. */
  async ollama({ system, prompt }) {
    const base = config.llm.baseUrl || 'http://127.0.0.1:11434';
    const res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: config.llm.model || 'llama3.2',
        stream: false,
        options: { temperature: config.llm.temperature, num_predict: config.llm.maxTokens },
        messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
    const body = await res.json();
    return body.message?.content?.trim() || '';
  },

  async anthropic({ system, prompt }) {
    const key = config.llm.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('LLM_API_KEY (or ANTHROPIC_API_KEY) is not set.');

    const res = await fetch(`${config.llm.baseUrl || 'https://api.anthropic.com'}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.llm.model || 'claude-opus-5',
        max_tokens: config.llm.maxTokens,
        system,
        /* Grounded extraction from supplied passages is not a reasoning-heavy
           task, and effort is what it costs. `temperature` is deliberately
           absent: the current Claude models reject it with a 400. */
        output_config: { effort: 'low' },
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);

    const body = await res.json();
    /* A safety decline arrives as HTTP 200 with stop_reason "refusal" and no
       usable text, so stop_reason is checked before content is read. */
    if (body.stop_reason === 'refusal') {
      throw new Error(`The model declined to answer (${body.stop_details?.category || 'unspecified'}).`);
    }
    return (body.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  },

  async openai({ system, prompt }) {
    const key = config.llm.apiKey || process.env.OPENAI_API_KEY;
    if (!key) throw new Error('LLM_API_KEY (or OPENAI_API_KEY) is not set.');

    const res = await fetch(`${config.llm.baseUrl || 'https://api.openai.com'}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: config.llm.model || 'gpt-4o-mini',
        max_completion_tokens: config.llm.maxTokens,
        messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const body = await res.json();
    return body.choices?.[0]?.message?.content?.trim() || '';
  },
};

export function hasGenerativeProvider() {
  return config.llm.provider !== 'extractive';
}

/**
 * @param {Request} request
 * @returns {Promise<string>} the model's text, or '' when running extractive
 */
export async function generate(request) {
  const provider = providers[config.llm.provider];
  if (provider === undefined) {
    throw new Error(
      `Unknown LLM_PROVIDER "${config.llm.provider}". Use one of: ${Object.keys(providers).join(', ')}.`,
    );
  }
  if (provider === null) return '';
  return provider(request);
}
