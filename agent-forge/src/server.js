import { app } from './app.js';
import { config } from './config.js';
import { warmup } from './embeddings.js';

/* The long-running server: a Mac, a Raspberry Pi, a $5 box. Ingestion of a
   large workbook takes longer than any serverless function is allowed to run,
   so this is the process that should do it. */
const port = config.server.port;
app.listen(port, async () => {
  console.log(`agent-forge listening on http://localhost:${port}`);
  console.log(`  answers via: ${config.llm.provider}`);
  /* Warming after the port is open: the server can accept uploads while the
     model loads, and a cold first question is the thing users notice. */
  await warmup().then(
    () => console.log('  embedding model ready'),
    (err) => console.error('  embedding model failed to load:', err.message),
  );
});
