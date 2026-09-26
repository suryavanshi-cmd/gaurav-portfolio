/**
 * Shared transient-failure retry for Gemini calls.
 *
 * A popular model answering 503 UNAVAILABLE ("high demand") is a queueing
 * signal, not a verdict on the request — retrying the same call a moment later
 * usually succeeds. Failing the job on the first one throws away whatever the
 * pipeline has already produced.
 *
 * Both the transcription and analysis providers go through this, so the
 * behaviour cannot drift between them.
 */

/** A rejected key or a malformed request; repeating these only wastes time. */
const FATAL = /API key|API_KEY_INVALID|PERMISSION_DENIED|INVALID_ARGUMENT|NOT_FOUND/i;

const TRANSIENT = /UNAVAILABLE|RESOURCE_EXHAUSTED|INTERNAL|DEADLINE_EXCEEDED|\b(429|500|502|503|504)\b/i;

export type GeminiRetryOptions = {
  attempts?: number;
  /** Wraps a fatal error in the caller's own error type. */
  onFatal: (message: string, cause: unknown) => Error;
  /** Wraps the final failure once retries are spent. */
  onExhausted: (message: string, cause: unknown) => Error;
  label?: string;
};

export async function withGeminiRetry<T>(
  call: () => Promise<T>,
  { attempts = 4, onFatal, onExhausted, label = 'gemini' }: GeminiRetryOptions,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await call();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);

      if (FATAL.test(message)) throw onFatal(message, error);
      if (!TRANSIENT.test(message) || attempt === attempts - 1) break;

      // 2s, 4s, 8s — long enough for a demand spike to clear, short enough to
      // stay inside the request's budget.
      const wait = 2000 * 2 ** attempt;
      console.warn(`[${label}] ${message.slice(0, 120)} — retrying in ${wait}ms`);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw onExhausted(message, lastError);
}

/** Turns a raw Gemini error into something worth showing a person. */
export function describeGeminiFailure(message: string, model: string): string {
  if (/UNAVAILABLE|high demand/i.test(message)) {
    return `Gemini (${model}) is overloaded right now — this usually clears in a minute, try again`;
  }
  if (/RESOURCE_EXHAUSTED|quota/i.test(message)) {
    return 'Gemini is rate limiting or out of quota — try again shortly';
  }
  return message;
}
