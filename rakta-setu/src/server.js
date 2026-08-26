import { config, assertConfig } from './config.js';
import { log } from './logger.js';
import { app } from './app.js';
import { storeName } from './store/index.js';
import { startWatcher } from './watcher/index.js';
import { ensureDirs } from './services/ingest.js';

/**
 * Long-running entry point, for a lab PC or any always-on host.
 *
 * The folder watcher lives here and only here: it needs a real directory that
 * persists between requests, which a serverless platform does not provide.
 * `api/index.js` is the serverless entry and starts none of this.
 */
function main() {
  ensureDirs();

  for (const problem of assertConfig()) log.warn(`config: ${problem}`);

  const server = app.listen(config.port, () => {
    log.info('');
    log.info('  ██  रक्त-सेतू  ·  RAKTA-SETU');
    log.info(`  ██  ${config.lab.name}`);
    log.info('');
    log.info(`  सर्व्हर सुरू · listening on ${config.publicBaseUrl} (port ${config.port})`);
    log.info(`  अहवाल साठवण · report store: ${storeName()}`);
    log.info(`  व्हॉट्सॲप ड्रायव्हर · whatsapp driver: ${config.whatsapp.driver}`);
    log.info(`  एआय · ai answers: ${config.ai.enabled ? `on (${config.ai.model})` : 'off (rule-based Marathi answers)'}`);
    log.info(`  क्रेडिट · billing: ${config.billing.enabled ? `on (${config.billing.model}, ${config.billing.tokensPerInr} tokens/₹)` : 'off'}`);
    log.info('');
  });

  const watcher = process.env.DISABLE_WATCHER === 'true' ? null : startWatcher();

  // A process that died mid-extraction leaves reserved tokens stranded and
  // unspendable. Hand them back on boot.
  if (config.billing.enabled) {
    import('./billing/credits.js')
      .then((m) => m.expireStaleHolds())
      .catch((err) => log.warn(`could not release stale holds: ${err.message}`));
  }

  const shutdown = (signal) => {
    log.info(`${signal} received — shutting down`);
    watcher?.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 8000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main();

export { app };
