/**
 * Vercel serverless entry point.
 *
 * Exports the Express app as the request handler. Nothing that assumes a
 * persistent process starts here — no listen(), no folder watcher, no SQLite.
 * The store driver resolves to Postgres automatically when VERCEL is set
 * (see src/store/index.js), because a serverless filesystem is ephemeral and
 * not shared between concurrent instances.
 *
 * The folder watcher stays on the lab PC and pushes finished reports to
 * /api/ingest here. See docs/DEPLOY-VERCEL.md.
 */
import { app } from '../src/app.js';

export default app;
