/* Vercel entry point. The Express app is exported rather than listened on, so
   the same code serves both a long-running process and a serverless function.

   Read the deployment section of the README before relying on this: query
   serving works well here, ingestion of anything large does not, because the
   embedding model has to be fetched on a cold container and a big workbook
   will outlast the function timeout. */
export { app as default } from '../src/app.js';
