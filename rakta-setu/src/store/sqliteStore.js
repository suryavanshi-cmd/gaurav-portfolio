/**
 * File-backed report storage for the lab PC.
 *
 * This module pulls in better-sqlite3, a native addon, so it is loaded only
 * when the sqlite driver is actually selected — importing it inside a
 * serverless bundle would fail at cold start.
 */
import * as reports from '../services/reports.js';

export const name = 'sqlite';

export async function findBySourceHash(hash) {
  return reports.findBySourceHash(hash) ?? null;
}

export async function createReport(input) {
  const existing = input.sourceHash ? reports.findBySourceHash(input.sourceHash) : null;
  if (existing) return { duplicate: true, id: existing.id, token: existing.token };

  const row = reports.createReport(input);
  return {
    duplicate: false,
    id: row.id,
    token: row.token,
    interpretation: row.interpretation,
    patient: row.patient,
  };
}

export async function getReportByToken(token) { return reports.getReportByToken(token); }
export async function getReportById(id) { return reports.getReportById(id); }
export async function recordOpen(id) { return reports.recordOpen(id); }
export async function updateStatus(id, status) { return reports.updateStatus(id, status); }
export async function recordDelivery(d) { return reports.recordDelivery(d); }
export async function recordQuestion(q) { return reports.recordQuestion(q); }
export async function listQuestions(id) { return reports.listQuestions(id); }
export async function audit(id, event, meta) { return reports.audit(id, event, meta); }
export async function listRecent(limit) { return reports.listRecent(limit); }
export async function latestReportForPhone(phone) { return reports.latestReportForPhone(phone); }
