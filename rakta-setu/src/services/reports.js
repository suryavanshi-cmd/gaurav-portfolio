import { db } from '../db.js';
import { config } from '../config.js';
import { log, maskName, maskPhone } from '../logger.js';
import { randomId, reportToken, sha256, safeEqual } from '../util/ids.js';
import { lastFour } from '../util/phone.js';
import { interpretReport } from '../domain/interpret.js';

const insertPatient = db.prepare(`
  INSERT INTO patients (id, name, phone, age, sex) VALUES (@id, @name, @phone, @age, @sex)
`);

const insertReport = db.prepare(`
  INSERT INTO reports (
    id, token, patient_id, lab_no, source_file, source_hash, collected_at, reported_at,
    doctor, measurements_json, interpretation_json, pin_hash, status, expires_at
  ) VALUES (
    @id, @token, @patient_id, @lab_no, @source_file, @source_hash, @collected_at, @reported_at,
    @doctor, @measurements_json, @interpretation_json, @pin_hash, @status, @expires_at
  )
`);

const selectByHash = db.prepare('SELECT id, token FROM reports WHERE source_hash = ?');

export function findBySourceHash(hash) {
  return selectByHash.get(hash);
}

/**
 * Creates a patient + report row and the capability token the WhatsApp link
 * carries. Everything happens in one transaction so a crash mid-way can never
 * leave a report the patient can open but staff cannot see.
 */
export const createReport = db.transaction(({ patient, measurements, sourceFile, sourceHash, labNo, collectedAt, reportedAt, doctor }) => {
  const interpretation = interpretReport(measurements, patient);

  const patientId = randomId(10);
  insertPatient.run({
    id: patientId,
    name: patient.name ?? null,
    phone: patient.phone ?? null,
    age: patient.age ?? null,
    sex: patient.sex ?? null,
  });

  const pin = patient.phone ? lastFour(patient.phone) : null;
  const expiresAt = config.links.ttlHours > 0
    ? new Date(Date.now() + config.links.ttlHours * 3600_000).toISOString()
    : null;

  const report = {
    id: randomId(10),
    token: reportToken(),
    patient_id: patientId,
    lab_no: labNo ?? null,
    source_file: sourceFile ?? null,
    source_hash: sourceHash ?? null,
    collected_at: collectedAt ?? null,
    reported_at: reportedAt ?? null,
    doctor: doctor ?? null,
    measurements_json: JSON.stringify(measurements),
    interpretation_json: JSON.stringify(interpretation),
    pin_hash: pin ? sha256(pin) : null,
    status: 'pending',
    expires_at: expiresAt,
  };

  insertReport.run(report);
  audit(report.id, 'report.created', { measurements: measurements.length, abnormal: interpretation.counts.abnormal });

  log.info(`अहवाल तयार · report created ${report.id} for ${maskName(patient.name)} (${maskPhone(patient.phone)}) — ${interpretation.counts.abnormal}/${interpretation.counts.total} abnormal`);

  return { ...report, interpretation, patient: { ...patient, id: patientId } };
});

const selectFull = db.prepare(`
  SELECT r.*, p.name AS patient_name, p.phone AS patient_phone, p.age AS patient_age, p.sex AS patient_sex
  FROM reports r JOIN patients p ON p.id = r.patient_id
  WHERE r.token = ?
`);

export function getReportByToken(token) {
  const row = selectFull.get(String(token || ''));
  if (!row) return null;
  return hydrate(row);
}

const selectById = db.prepare(`
  SELECT r.*, p.name AS patient_name, p.phone AS patient_phone, p.age AS patient_age, p.sex AS patient_sex
  FROM reports r JOIN patients p ON p.id = r.patient_id
  WHERE r.id = ?
`);

export function getReportById(id) {
  const row = selectById.get(String(id || ''));
  return row ? hydrate(row) : null;
}

function hydrate(row) {
  return {
    id: row.id,
    token: row.token,
    labNo: row.lab_no,
    sourceFile: row.source_file,
    collectedAt: row.collected_at,
    reportedAt: row.reported_at,
    doctor: row.doctor,
    status: row.status,
    expiresAt: row.expires_at,
    openCount: row.open_count,
    firstOpenedAt: row.first_opened_at,
    createdAt: row.created_at,
    pinHash: row.pin_hash,
    measurements: JSON.parse(row.measurements_json),
    interpretation: JSON.parse(row.interpretation_json),
    patient: {
      id: row.patient_id,
      name: row.patient_name,
      phone: row.patient_phone,
      age: row.patient_age,
      sex: row.patient_sex,
    },
  };
}

export function isExpired(report) {
  if (!report?.expiresAt) return false;
  return new Date(report.expiresAt).getTime() < Date.now();
}

/**
 * The link alone is a capability, so a forwarded WhatsApp message would expose
 * the report. Requiring the last four digits of the patient's own number is a
 * deliberately low-friction second factor — the patient always knows it, and a
 * stranger holding a forwarded link usually does not.
 */
export function verifyPin(report, pin) {
  if (!config.links.requireVerification) return true;
  if (!report.pinHash) return true; // no phone on file — nothing to check against
  return safeEqual(sha256(String(pin || '').trim()), report.pinHash);
}

const markOpened = db.prepare(`
  UPDATE reports
  SET open_count = open_count + 1,
      first_opened_at = COALESCE(first_opened_at, datetime('now')),
      status = CASE WHEN status = 'sent' THEN 'opened' ELSE status END
  WHERE id = ?
`);

export function recordOpen(reportId) {
  markOpened.run(reportId);
  audit(reportId, 'report.opened');
}

const setStatus = db.prepare('UPDATE reports SET status = ? WHERE id = ?');
export function updateStatus(reportId, status) {
  setStatus.run(status, reportId);
}

const insertDelivery = db.prepare(`
  INSERT INTO deliveries (id, report_id, driver, to_phone, status, provider_message_id, error, attempt)
  VALUES (@id, @report_id, @driver, @to_phone, @status, @provider_message_id, @error, @attempt)
`);

export function recordDelivery({ reportId, driver, toPhone, status, providerMessageId, error, attempt = 1 }) {
  const id = randomId(10);
  insertDelivery.run({
    id,
    report_id: reportId,
    driver,
    to_phone: toPhone ?? null,
    status,
    provider_message_id: providerMessageId ?? null,
    error: error ? String(error).slice(0, 500) : null,
    attempt,
  });
  return id;
}

const insertQuestion = db.prepare(`
  INSERT INTO questions (id, report_id, question, answer, source) VALUES (@id, @report_id, @question, @answer, @source)
`);

export function recordQuestion({ reportId, question, answer, source }) {
  insertQuestion.run({ id: randomId(10), report_id: reportId, question, answer, source });
}

const selectQuestions = db.prepare('SELECT question, answer, source, created_at FROM questions WHERE report_id = ? ORDER BY created_at ASC LIMIT 30');
export function listQuestions(reportId) {
  return selectQuestions.all(reportId);
}

const insertAudit = db.prepare('INSERT INTO audit (id, report_id, event, meta) VALUES (?, ?, ?, ?)');
export function audit(reportId, event, meta) {
  insertAudit.run(randomId(10), reportId ?? null, event, meta ? JSON.stringify(meta) : null);
}

const recentReports = db.prepare(`
  SELECT r.id, r.token, r.lab_no, r.status, r.created_at, r.open_count,
         p.name AS patient_name, p.phone AS patient_phone
  FROM reports r JOIN patients p ON p.id = r.patient_id
  ORDER BY r.created_at DESC LIMIT ?
`);

export function listRecent(limit = 50) {
  return recentReports.all(limit).map((r) => ({
    id: r.id,
    labNo: r.lab_no,
    status: r.status,
    createdAt: r.created_at,
    openCount: r.open_count,
    patientName: r.patient_name,
    patientPhone: maskPhone(r.patient_phone),
    url: `${config.publicBaseUrl}/r/${r.token}`,
  }));
}

export { sha256 };
