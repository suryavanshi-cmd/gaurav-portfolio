import { config } from '../config.js';
import { log } from '../logger.js';
import { prepareReport } from './prepare.js';
import { sha256, safeEqual } from '../util/ids.js';

/**
 * Report storage, behind one interface with two drivers.
 *
 *   sqlite   — a file on the lab PC. The default for a local install.
 *   supabase — Postgres. Required for any serverless deployment, because
 *              Vercel's filesystem is ephemeral and not shared between
 *              function instances: a SQLite file there loses every report on
 *              redeploy, and two concurrent requests see different databases.
 *
 * The driver is imported dynamically so a serverless bundle never has to load
 * better-sqlite3, a native addon that would fail at cold start.
 */

function resolveDriverName() {
  const explicit = (process.env.STORE_DRIVER || '').toLowerCase().trim();
  if (explicit === 'sqlite' || explicit === 'supabase') return explicit;
  // Serverless: no persistent disk, so Postgres is the only correct choice.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) return 'supabase';
  return 'sqlite';
}

let driverPromise = null;

export function storeName() {
  return resolveDriverName();
}

async function driver() {
  if (!driverPromise) {
    const chosen = resolveDriverName();
    if (chosen === 'supabase' && !config.supabase.enabled) {
      throw new Error(
        'STORE_DRIVER resolves to "supabase" but SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set. '
        + 'A serverless deployment cannot use SQLite — see docs/DEPLOY-VERCEL.md.',
      );
    }
    log.info(`अहवाल साठवण · report store: ${chosen}`);
    driverPromise = chosen === 'supabase'
      ? import('./supabaseStore.js')
      : import('./sqliteStore.js');
  }
  return driverPromise;
}

/**
 * Creates a report and the capability token its WhatsApp link carries.
 * The token, PIN hash and interpretation are computed here rather than in a
 * driver, so both storage backends behave identically.
 */
export async function createReport(input) {
  const prepared = prepareReport(input);
  const d = await driver();
  return d.createReport({ ...input, prepared });
}

export async function findBySourceHash(hash) { return (await driver()).findBySourceHash(hash); }
export async function getReportByToken(token) { return (await driver()).getReportByToken(token); }
export async function getReportById(id) { return (await driver()).getReportById(id); }
export async function recordOpen(id) { return (await driver()).recordOpen(id); }
export async function updateStatus(id, status) { return (await driver()).updateStatus(id, status); }
export async function recordDelivery(d) { return (await driver()).recordDelivery(d); }
export async function recordQuestion(q) { return (await driver()).recordQuestion(q); }
export async function listQuestions(id) { return (await driver()).listQuestions(id); }
export async function audit(id, event, meta) { return (await driver()).audit(id, event, meta); }
export async function listRecent(limit, labId) { return (await driver()).listRecent(limit, labId); }
export async function latestReportForPhone(phone) { return (await driver()).latestReportForPhone(phone); }

// ── pure helpers, identical for both drivers ────────────────────────────────

export function isExpired(report) {
  if (!report?.expiresAt) return false;
  return new Date(report.expiresAt).getTime() < Date.now();
}

/**
 * The link alone is a capability, so a forwarded WhatsApp message would expose
 * the report. The last four digits of the patient's own number is a
 * deliberately low-friction second factor.
 */
export function verifyPin(report, pin) {
  if (!config.links.requireVerification) return true;
  if (!report?.pinHash) return true;
  return safeEqual(sha256(String(pin || '').trim()), report.pinHash);
}
