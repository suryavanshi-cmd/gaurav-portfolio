import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { log, maskName, maskPhone } from '../logger.js';
import { parseReportFile, UnparseableReport } from '../parsers/index.js';
import { createReport, findBySourceHash, recordDelivery, updateStatus, audit, getReportById } from './reports.js';
import { sendReportLink } from './whatsapp/index.js';

async function fileHash(filePath) {
  const buf = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function moveTo(dir, filePath) {
  await fs.mkdir(dir, { recursive: true });
  const base = path.basename(filePath);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(dir, `${stamp}__${base}`);
  try {
    await fs.rename(filePath, target);
  } catch (err) {
    if (err.code === 'EXDEV') {
      // Analyzer share on a different volume — copy then unlink.
      await fs.copyFile(filePath, target);
      await fs.unlink(filePath);
    } else throw err;
  }
  return target;
}

export function reportUrl(token) {
  return `${config.publicBaseUrl}/r/${token}`;
}

/**
 * The whole pipeline for one file dropped by the analyzer:
 *   parse → de-duplicate → store → WhatsApp → archive
 *
 * Failure policy matters here. A file we cannot parse, or a report with no
 * phone number, is moved to FAILED_DIR and left for a human — the one thing
 * this must never do is guess and send a wrong result to a patient.
 *
 * @param {string} filePath
 * @param {{send?: boolean, moveFiles?: boolean}} options
 */
export async function ingestFile(filePath, { send = true, moveFiles = true } = {}) {
  const name = path.basename(filePath);
  log.info(`नवीन फाइल · ingesting ${name}`);

  let hash;
  try {
    hash = await fileHash(filePath);
  } catch (err) {
    log.error(`Cannot read ${name}: ${err.message}`);
    return { ok: false, reason: 'UNREADABLE' };
  }

  const existing = findBySourceHash(hash);
  if (existing) {
    log.info(`ही फाइल आधीच पाठवली आहे · duplicate of report ${existing.id}, skipping`);
    if (moveFiles) await moveTo(config.watch.archiveDir, filePath);
    return { ok: true, duplicate: true, reportId: existing.id };
  }

  let parsed;
  try {
    parsed = await parseReportFile(filePath);
  } catch (err) {
    const code = err instanceof UnparseableReport ? err.code : 'PARSE_ERROR';
    log.error(`वाचता आलं नाही · could not parse ${name} [${code}]: ${err.message}`);
    audit(null, 'ingest.failed', { file: name, code, message: err.message });
    if (moveFiles) await moveTo(config.watch.failedDir, filePath);
    return { ok: false, reason: code, message: err.message };
  }

  const report = createReport({
    patient: parsed.patient,
    measurements: parsed.measurements,
    sourceFile: parsed.sourceFile,
    sourceHash: hash,
    labNo: parsed.patient.labNo,
    collectedAt: parsed.patient.collectedAt,
    reportedAt: parsed.patient.reportedAt,
    doctor: parsed.patient.doctor,
  });

  const url = reportUrl(report.token);

  if (!parsed.patient.phone) {
    log.warn(`फोन नंबर सापडला नाही · no phone number in ${name} — report ${report.id} saved but not sent`);
    updateStatus(report.id, 'needs_phone');
    audit(report.id, 'ingest.no_phone', { file: name });
    if (moveFiles) await moveTo(config.watch.failedDir, filePath);
    return { ok: true, sent: false, reason: 'NO_PHONE', reportId: report.id, url };
  }

  if (!send) {
    if (moveFiles) await moveTo(config.watch.archiveDir, filePath);
    return { ok: true, sent: false, reason: 'SEND_DISABLED', reportId: report.id, url };
  }

  try {
    const result = await sendReportLink({ report, url, labName: config.lab.name });
    updateStatus(report.id, 'sent');
    recordDelivery({
      reportId: report.id,
      driver: result.driver,
      toPhone: report.patient.phone,
      status: 'sent',
      providerMessageId: result.providerMessageId,
      attempt: result.attempt,
    });
    audit(report.id, 'whatsapp.sent', { driver: result.driver });
    log.info(`पाठवलं · report ${report.id} sent to ${maskName(report.patient.name)} ${maskPhone(report.patient.phone)}`);
    if (moveFiles) await moveTo(config.watch.archiveDir, filePath);
    return { ok: true, sent: true, reportId: report.id, url };
  } catch (err) {
    log.error(`पाठवता आलं नाही · WhatsApp delivery failed for ${report.id}: ${err.message}`);
    updateStatus(report.id, 'send_failed');
    recordDelivery({
      reportId: report.id,
      driver: config.whatsapp.driver,
      toPhone: report.patient.phone,
      status: 'failed',
      error: err.message,
      attempt: err.attempts ?? 1,
    });
    audit(report.id, 'whatsapp.failed', { message: err.message });
    // The report itself is fine — keep the file so staff can retry from /staff.
    if (moveFiles) await moveTo(config.watch.failedDir, filePath);
    return { ok: false, reason: 'SEND_FAILED', message: err.message, reportId: report.id, url };
  }
}

/** Re-attempt delivery for a stored report (used by the staff console). */
export async function resendReport(reportId) {
  const report = getReportById(reportId);
  if (!report) throw new Error('Report not found');
  if (!report.patient.phone) throw new Error('This report has no phone number on file');

  const url = reportUrl(report.token);
  const result = await sendReportLink({ report, url, labName: config.lab.name });
  updateStatus(report.id, 'sent');
  recordDelivery({
    reportId: report.id,
    driver: result.driver,
    toPhone: report.patient.phone,
    status: 'sent',
    providerMessageId: result.providerMessageId,
    attempt: result.attempt,
  });
  audit(report.id, 'whatsapp.resent', { driver: result.driver });
  return { url, providerMessageId: result.providerMessageId };
}

export function ensureDirs() {
  for (const dir of [config.watch.dir, config.watch.archiveDir, config.watch.failedDir, config.dataDir]) {
    fssync.mkdirSync(dir, { recursive: true });
  }
}
