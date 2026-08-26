import express from 'express';
import { config } from '../config.js';
import { log, maskName, maskPhone } from '../logger.js';
import { sha256 } from '../util/ids.js';
import { normalisePhone } from '../util/phone.js';
import { rpc } from '../billing/supabaseClient.js';
import { createReport, updateStatus, recordDelivery, audit } from '../store/index.js';
import { sendReportLink } from '../services/whatsapp/index.js';
import { reportUrl } from '../services/ingest.js';
import { ANALYTE_BY_KEY } from '../domain/analytes.js';

export const ingestRoutes = express.Router();

/**
 * Push endpoint for the lab's folder watcher.
 *
 * The watcher cannot run on a serverless platform — it needs a real directory
 * that persists between requests — so it stays on the lab PC, parses locally,
 * and POSTs the finished result here. That split is why this route exists.
 *
 * It authenticates with a long-lived lab key rather than a browser JWT: the
 * watcher is an unattended background process with no user session. Only the
 * SHA-256 of the key is stored, so a leaked database row yields nothing usable.
 */
async function requireLabKey(req, res, next) {
  const key = req.get('x-lab-key') || '';
  if (!key) {
    return res.status(401).json({ error: 'missing X-Lab-Key header' });
  }
  if (!config.supabase.enabled) {
    // Local single-lab install: the watcher writes through the store directly
    // and never needs this route.
    return res.status(503).json({ error: 'ingest API requires Supabase to be configured' });
  }

  try {
    const row = await rpc('fn_verify_lab_key', { p_key_hash: sha256(key) });
    if (!row?.lab_id) {
      log.warn('rejected an ingest request with an unknown lab key');
      return res.status(401).json({ error: 'invalid or revoked lab key' });
    }
    req.labId = row.lab_id;
    return next();
  } catch (err) {
    log.error(`lab key verification failed: ${err.message}`);
    return res.status(503).json({ error: 'could not verify lab key' });
  }
}

/** Rejects anything that is not a well-formed, in-vocabulary measurement list. */
function validateMeasurements(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { error: 'measurements must be a non-empty array' };
  }
  if (raw.length > 100) {
    return { error: 'too many measurements (max 100)' };
  }

  const clean = [];
  for (const m of raw) {
    if (!m || typeof m.key !== 'string' || !ANALYTE_BY_KEY.has(m.key)) continue;
    const value = Number(m.value);
    if (!Number.isFinite(value)) continue;
    clean.push({
      key: m.key,
      value,
      unit: typeof m.unit === 'string' ? m.unit.slice(0, 32) : null,
      rawLabel: typeof m.rawLabel === 'string' ? m.rawLabel.slice(0, 120) : null,
    });
  }

  if (clean.length === 0) return { error: 'no recognised measurements in the payload' };
  return { measurements: clean };
}

/**
 * POST /api/ingest/report
 *
 * Body: { patient, measurements, sourceFile?, sourceHash?, send? }
 * Header: X-Lab-Key
 */
ingestRoutes.post('/report', requireLabKey, async (req, res) => {
  const body = req.body ?? {};
  const { measurements, error } = validateMeasurements(body.measurements);
  if (error) return res.status(400).json({ ok: false, error });

  const rawPatient = body.patient ?? {};
  const phone = normalisePhone(rawPatient.phone);
  const patient = {
    name: typeof rawPatient.name === 'string' ? rawPatient.name.slice(0, 80) : null,
    age: Number.isFinite(Number(rawPatient.age)) ? Number(rawPatient.age) : null,
    sex: rawPatient.sex === 'male' || rawPatient.sex === 'female' ? rawPatient.sex : null,
    phone,
  };

  try {
    const created = await createReport({
      patient,
      measurements,
      labId: req.labId,
      labNo: body.labNo ?? null,
      sourceFile: body.sourceFile ?? null,
      sourceHash: body.sourceHash ?? null,
      collectedAt: body.collectedAt ?? null,
      reportedAt: body.reportedAt ?? null,
      doctor: body.doctor ?? null,
    });

    if (created.duplicate) {
      return res.json({
        ok: true, duplicate: true, report_id: created.id, url: reportUrl(created.token),
      });
    }

    const url = reportUrl(created.token);
    const report = { ...created, patient: created.patient };

    if (!phone) {
      await updateStatus(created.id, 'needs_phone');
      await audit(created.id, 'ingest.no_phone', { source: body.sourceFile ?? null });
      return res.json({ ok: true, sent: false, reason: 'NO_PHONE', report_id: created.id, url });
    }

    if (body.send === false) {
      return res.json({ ok: true, sent: false, reason: 'SEND_DISABLED', report_id: created.id, url });
    }

    try {
      const result = await sendReportLink({ report, url, labName: config.lab.name });
      await updateStatus(created.id, 'sent');
      await recordDelivery({
        reportId: created.id,
        driver: result.driver,
        toPhone: phone,
        status: 'sent',
        providerMessageId: result.providerMessageId,
        attempt: result.attempt,
      });
      await audit(created.id, 'whatsapp.sent', { driver: result.driver });
      log.info(`ingest: report ${created.id} sent to ${maskName(patient.name)} ${maskPhone(phone)}`);
      return res.json({ ok: true, sent: true, report_id: created.id, url });
    } catch (sendErr) {
      await updateStatus(created.id, 'send_failed');
      await recordDelivery({
        reportId: created.id,
        driver: config.whatsapp.driver,
        toPhone: phone,
        status: 'failed',
        error: sendErr.message,
        attempt: sendErr.attempts ?? 1,
      });
      await audit(created.id, 'whatsapp.failed', { message: sendErr.message });
      log.error(`ingest: delivery failed for ${created.id}: ${sendErr.message}`);
      return res.status(502).json({
        ok: false, reason: 'SEND_FAILED', report_id: created.id, url, error: sendErr.message,
      });
    }
  } catch (err) {
    log.error(`ingest failed: ${err.stack || err.message}`);
    return res.status(500).json({ ok: false, error: 'could not store the report' });
  }
});

/** GET /api/ingest/ping — lets the watcher verify its key at startup. */
ingestRoutes.get('/ping', requireLabKey, (req, res) => {
  res.json({ ok: true, lab_id: req.labId, store: 'supabase' });
});
