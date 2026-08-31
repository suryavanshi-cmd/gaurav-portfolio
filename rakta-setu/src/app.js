import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { log } from './logger.js';
import { storeName, getReportByToken } from './store/index.js';
import { api } from './routes/api.js';
import { webhook } from './routes/webhook.js';
import { paymentRoutes } from './routes/payment.js';
import { userRoutes } from './routes/user.js';
import { extractRoutes } from './routes/extract.js';
import { ingestRoutes } from './routes/ingest.js';

/**
 * Builds the Express app.
 *
 * Deliberately contains no `listen()` and starts no folder watcher, so the
 * same app object serves both the long-running process on a lab PC
 * (`src/server.js`) and a serverless function (`api/index.js`). Anything that
 * assumes a persistent process belongs in the former, never here.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(here, '..', 'public');

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

// The Razorpay webhook signature is an HMAC over the exact bytes Razorpay
// sent, so this route must see the raw buffer. Mounting express.raw() ahead of
// express.json() is what preserves it — a parsed-then-reserialised body has
// different key order and whitespace, and would fail every signature check.
app.use('/api/payment/webhook', express.raw({ type: '*/*', limit: '1mb' }));

app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  // Report pages carry health data — keep them out of shared caches and CDNs.
  if (req.path.startsWith('/api/') || req.path.startsWith('/r/')) {
    res.setHeader('Cache-Control', 'no-store, private');
  }
  next();
});

app.use('/api', api);
app.use('/webhook', webhook);
app.use('/api/ingest', ingestRoutes);

// Billing is opt-in. With BILLING_ENABLED unset these are not mounted at all
// and the free local path is unchanged.
if (config.billing.enabled) {
  app.use('/api/payment', paymentRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/extract', extractRoutes);
}

app.get('/health', async (req, res) => {
  // Probe the store. A health check that only proves the process is running
  // will report green while every report request fails on a bad connection
  // string — exactly the case worth catching on a fresh deployment.
  let storeOk = true;
  let storeError = null;
  try {
    await getReportByToken('__healthcheck__');
  } catch (err) {
    storeOk = false;
    storeError = err.message;
  }

  res.status(storeOk ? 200 : 503).json({
    ok: storeOk,
    store: storeName(),
    store_ok: storeOk,
    store_error: storeError,
    driver: config.whatsapp.driver,
    ai: config.ai.enabled,
    billing: config.billing.enabled
      ? { enabled: true, model: config.billing.model, tokens_per_inr: config.billing.tokensPerInr }
      : { enabled: false },
  });
});

app.use(express.static(publicDir, { extensions: ['html'], maxAge: '1h' }));

app.get('/r/:token', (req, res) => res.sendFile(path.join(publicDir, 'report.html')));
app.get('/staff', (req, res) => res.sendFile(path.join(publicDir, 'staff.html')));

app.use((req, res) => res.status(404).sendFile(path.join(publicDir, '404.html')));

app.use((err, req, res, _next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'फाइल खूप मोठी आहे.', error_en: 'Payload too large' });
  }
  log.error(`Unhandled request error: ${err.stack || err.message}`);
  return res.status(500).json({ error: 'सर्व्हरवर अडचण आली आहे.' });
});
