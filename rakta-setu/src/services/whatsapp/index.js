import { config } from '../../config.js';
import { log } from '../../logger.js';
import { whatsappSummary } from '../../domain/interpret.js';
import * as cloud from './cloud.js';
import * as twilio from './twilio.js';
import * as consoleDriver from './console.js';

const DRIVERS = { cloud, twilio, console: consoleDriver };

export function activeDriver() {
  return DRIVERS[config.whatsapp.driver] ?? consoleDriver;
}

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * Sends a report link over WhatsApp with bounded retries.
 * Permanent failures (bad number, unapproved template) fail fast — retrying
 * them just delays the moment a human finds out something is wrong.
 */
export async function sendReportLink({ report, url, labName }, { maxAttempts = 3 } = {}) {
  const driver = activeDriver();
  const to = report.patient.phone;
  if (!to) {
    const err = new Error('No phone number on the report — cannot deliver');
    err.retryable = false;
    throw err;
  }

  const message = whatsappSummary(report.interpretation, {
    patientName: report.patient.name,
    labName,
    url,
  });

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = config.whatsapp.driver === 'cloud'
        ? await cloud.sendReportTemplate({
          to,
          patientName: report.patient.name,
          labName,
          summary: report.interpretation.headline,
          token: report.token,
        })
        : await driver.sendReportTemplate({ to, message });

      return { ...result, attempt, message, driver: config.whatsapp.driver };
    } catch (err) {
      lastError = err;
      if (err.retryable === false || attempt === maxAttempts) break;
      const backoff = 2 ** attempt * 1000;
      log.warn(`WhatsApp send failed (attempt ${attempt}/${maxAttempts}), retrying in ${backoff}ms: ${err.message}`);
      await sleep(backoff);
    }
  }

  lastError.attempts = maxAttempts;
  throw lastError;
}

/** Plain-text send used by the inbound webhook (inside the 24h window). */
export async function sendPlainText({ to, text }) {
  return activeDriver().sendText({ to, text });
}
