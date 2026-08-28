import { supabase, rpc } from '../billing/supabaseClient.js';
import { config } from '../config.js';
import { log, maskPhone } from '../logger.js';

/**
 * Postgres-backed report storage.
 *
 * This is the driver a serverless deployment must use. Vercel gives each
 * function invocation an ephemeral filesystem that is not shared between
 * instances, so a SQLite file there would lose every report on redeploy and
 * two concurrent requests would see different databases.
 */

export const name = 'supabase';

export async function findBySourceHash(hash) {
  if (!hash) return null;
  const { data, error } = await supabase()
    .from('reports').select('id, token').eq('source_hash', hash).maybeSingle();
  if (error) throw new Error(`findBySourceHash: ${error.message}`);
  return data ?? null;
}

export async function createReport({
  patient, measurements, prepared, labId = null, labNo = null,
  sourceFile = null, sourceHash = null, collectedAt = null, reportedAt = null, doctor = null,
}) {
  const row = await rpc('fn_create_report', {
    p_token: prepared.token,
    p_patient: {
      name: patient.name ?? null,
      phone: patient.phone ?? null,
      age: patient.age ?? null,
      sex: patient.sex ?? null,
    },
    p_measurements: measurements,
    p_interpretation: prepared.interpretation,
    p_pin_hash: prepared.pinHash,
    p_lab_id: labId,
    p_lab_no: labNo,
    p_source_file: sourceFile,
    p_source_hash: sourceHash,
    p_collected_at: collectedAt,
    p_reported_at: reportedAt,
    p_doctor: doctor,
    p_expires_at: prepared.expiresAt,
  });

  if (row?.duplicate) {
    return { duplicate: true, id: row.report_id, token: row.existing_token };
  }

  log.info(`अहवाल तयार · report ${row.report_id} stored (${maskPhone(patient.phone)})`);

  return {
    duplicate: false,
    id: row.report_id,
    token: prepared.token,
    interpretation: prepared.interpretation,
    patient: { ...patient, id: row.patient_id },
  };
}

function hydrate(row) {
  if (!row) return null;
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
    measurements: row.measurements ?? [],
    interpretation: row.interpretation ?? {},
    patient: {
      id: row.patient_id,
      name: row.patient_name,
      phone: row.patient_phone,
      age: row.patient_age,
      sex: row.patient_sex,
    },
  };
}

export async function getReportByToken(token) {
  return hydrate(await rpc('fn_get_report_by_token', { p_token: String(token || '') }));
}

export async function getReportById(id) {
  const { data, error } = await supabase()
    .from('reports')
    .select('*, patients(id, name, phone, age, sex)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`getReportById: ${error.message}`);
  if (!data) return null;

  return hydrate({
    ...data,
    patient_id: data.patients?.id,
    patient_name: data.patients?.name,
    patient_phone: data.patients?.phone,
    patient_age: data.patients?.age,
    patient_sex: data.patients?.sex,
  });
}

export async function recordOpen(reportId) {
  await rpc('fn_record_report_open', { p_report_id: reportId });
}

export async function updateStatus(reportId, status) {
  const { error } = await supabase().from('reports').update({ status }).eq('id', reportId);
  if (error) throw new Error(`updateStatus: ${error.message}`);
}

export async function recordDelivery({ reportId, driver, toPhone, status, providerMessageId, error: sendError, attempt = 1 }) {
  const { error } = await supabase().from('deliveries').insert({
    report_id: reportId,
    driver,
    to_phone: toPhone ?? null,
    status,
    provider_message_id: providerMessageId ?? null,
    error: sendError ? String(sendError).slice(0, 500) : null,
    attempt,
  });
  if (error) log.warn(`recordDelivery: ${error.message}`);
}

export async function recordQuestion({ reportId, question, answer, source }) {
  const { error } = await supabase().from('questions')
    .insert({ report_id: reportId, question, answer, source });
  if (error) log.warn(`recordQuestion: ${error.message}`);
}

export async function listQuestions(reportId) {
  const { data, error } = await supabase()
    .from('questions').select('question, answer, source, created_at')
    .eq('report_id', reportId).order('created_at', { ascending: true }).limit(30);
  if (error) throw new Error(`listQuestions: ${error.message}`);
  return data ?? [];
}

export async function audit(reportId, event, meta) {
  const { error } = await supabase().from('audit_log')
    .insert({ report_id: reportId ?? null, event, meta: meta ?? null });
  if (error) log.debug(`audit write failed: ${error.message}`);
}

export async function listRecent(limit = 50, labId = null) {
  let query = supabase()
    .from('reports')
    .select('id, token, lab_no, status, created_at, open_count, patients(name, phone)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (labId) query = query.eq('lab_id', labId);

  const { data, error } = await query;
  if (error) throw new Error(`listRecent: ${error.message}`);

  return (data ?? []).map((r) => ({
    id: r.id,
    labNo: r.lab_no,
    status: r.status,
    createdAt: r.created_at,
    openCount: r.open_count,
    patientName: r.patients?.name ?? null,
    patientPhone: maskPhone(r.patients?.phone),
    url: `${config.publicBaseUrl}/r/${r.token}`,
  }));
}
