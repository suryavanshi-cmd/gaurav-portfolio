import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, assertConfig } from './config.js';
import { log } from './logger.js';
import { api } from './routes/api.js';
import { webhook } from './routes/webhook.js';
import { paymentRoutes } from './routes/payment.js';
import { userRoutes } from './routes/user.js';
import { extractRoutes } from './routes/extract.js';
import { expireStaleHolds } from './billing/credits.js';
import { startWatcher } from './watcher/index.js';
import { ensureDirs } from './services/ingest.js';
import { closeDb } from './db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(here, '..', 'public');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
// The Razorpay webhook signature is an HMAC over the exact bytes Razorpay
// sent, so this route must see the raw buffer. Mounting express.raw() ahead of
// express.json() is what preserves it — a parsed-then-reserialised body has
// different key order and whitespace, and would fail every signature check.
app.use('/api/payment/webhook', express.raw({ type: '*/*', limit: '1mb' }));

app.use(express.json({ limit: '256kb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  // Report pages contain health data — keep them out of shared caches.
  if (req.path.startsWith('/api/') || req.path.startsWith('/r/')) {
    res.setHeader('Cache-Control', 'no-store, private');
  }
  next();
});

app.use('/api', api);
app.use('/webhook', webhook);

// Billing is opt-in. With BILLING_ENABLED unset the free local extraction path
// is unchanged and none of this code is reachable.
if (config.billing.enabled) {
  app.use('/api/payment', paymentRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/extract', extractRoutes);
}

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    driver: config.whatsapp.driver,
    ai: config.ai.enabled,
    billing: config.billing.enabled
      ? { enabled: true, model: config.billing.model, tokens_per_inr: config.billing.tokensPerInr }
      : { enabled: false },
  });
});

app.use(express.static(publicDir, { extensions: ['html'], maxAge: '1h' }));

// The patient-facing link. The token stays in the URL for the client to read;
// the server hands back the same shell page for every report.
app.get('/r/:token', (req, res) => {
  res.sendFile(path.join(publicDir, 'report.html'));
});

app.get('/staff', (req, res) => {
  res.sendFile(path.join(publicDir, 'staff.html'));
});

app.use((req, res) => res.status(404).sendFile(path.join(publicDir, '404.html')));

app.use((err, req, res, _next) => {
  log.error(`Unhandled request error: ${err.stack || err.message}`);
  res.status(500).json({ error: 'सर्व्हरवर अडचण आली आहे.' });
});

function main() {
  ensureDirs();

  const problems = assertConfig();
  for (const p of problems) log.warn(`config: ${p}`);

  const server = app.listen(config.port, () => {
    log.info('');
    log.info('  ██  रक्त-सेतू  ·  RAKTA-SETU');
    log.info(`  ██  ${config.lab.name}`);
    log.info('');
    log.info(`  सर्व्हर सुरू · listening on ${config.publicBaseUrl} (port ${config.port})`);
    log.info(`  व्हॉट्सॲप ड्रायव्हर · whatsapp driver: ${config.whatsapp.driver}`);
    log.info(`  एआय · ai answers: ${config.ai.enabled ? `on (${config.ai.model})` : 'off (rule-based Marathi answers)'}`);
    log.info(`  क्रेडिट · billing: ${config.billing.enabled ? `on (${config.billing.model}, ${config.billing.tokensPerInr} tokens/₹)` : 'off'}`);
    log.info('');
  });

  const watcher = process.env.DISABLE_WATCHER === 'true' ? null : startWatcher();

  // A process that died mid-extraction leaves reserved tokens stranded and
  // unspendable. Hand them back on boot.
  if (config.billing.enabled) {
    expireStaleHolds().catch((err) => log.warn(`could not release stale holds: ${err.message}`));
  }

  const shutdown = (signal) => {
    log.info(`${signal} received — shutting down`);
    watcher?.close();
    server.close(() => { closeDb(); process.exit(0); });
    setTimeout(() => process.exit(1), 8000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main();

export { app };
