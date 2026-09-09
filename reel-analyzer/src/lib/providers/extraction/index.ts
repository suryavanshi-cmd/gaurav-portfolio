import { extractionProvider } from '@/lib/env';
import { MetaExtractionProvider } from './meta';
import type { ExtractionProvider } from './types';

export * from './types';
export { parseShortcode } from './meta';

/**
 * Returns null when no extraction provider is configured, which is a supported
 * state: the link path is a convenience, and the app falls back to asking for
 * an upload rather than failing to start.
 */
export function getExtractionProvider(): ExtractionProvider | null {
  if (extractionProvider === 'none') return null;
  const provider = new MetaExtractionProvider();
  return provider.isConfigured() ? provider : null;
}
