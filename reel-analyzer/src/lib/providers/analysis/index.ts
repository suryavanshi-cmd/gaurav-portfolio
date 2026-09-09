import { analysisProvider } from '@/lib/env';
import { ClaudeAnalysisProvider } from './claude';
import { GeminiAnalysisProvider } from './gemini';
import { AnalysisError, type AnalysisInput, type AnalysisOutput, type AnalysisProvider } from './types';

export * from './schema';
export * from './types';

/**
 * ANALYSIS_PROVIDER picks the model behind the report: `claude` or `gemini`.
 *
 * When it is unset, whichever key is present wins — so a deployment that only
 * has GEMINI_API_KEY works without also having to set the selector.
 */
export function getAnalysisProvider(): AnalysisProvider | null {
  const candidates: AnalysisProvider[] =
    analysisProvider === 'gemini'
      ? [new GeminiAnalysisProvider()]
      : analysisProvider === 'claude'
        ? [new ClaudeAnalysisProvider()]
        : [new ClaudeAnalysisProvider(), new GeminiAnalysisProvider()];

  return candidates.find((provider) => provider.isConfigured()) ?? null;
}

export async function analyseReel(input: AnalysisInput): Promise<AnalysisOutput> {
  const provider = getAnalysisProvider();
  if (!provider) {
    throw new AnalysisError(
      'no analysis provider is configured on this deployment — set ANTHROPIC_API_KEY or GEMINI_API_KEY',
    );
  }
  return provider.analyse(input);
}
