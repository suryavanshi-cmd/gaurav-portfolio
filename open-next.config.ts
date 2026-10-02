import { defineCloudflareConfig } from '@opennextjs/cloudflare';

/*
  How OpenNext adapts `next build` output for the Workers runtime.

  The extension is .ts because that is the only filename the adapter looks
  for; the contents are plain JavaScript and the adapter bundles this file
  itself, so the project stays JS and needs no TypeScript toolchain.

  Defaults are deliberate. The portfolio has no ISR and no `use cache`, so
  there is nothing for an incremental cache to hold — adding a KV or R2 cache
  here would be configuration with no reader. Revisit it when a page starts
  revalidating.
*/
export default defineCloudflareConfig();
