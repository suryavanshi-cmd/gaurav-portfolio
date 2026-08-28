import { config } from '../config.js';
import { reportToken, sha256 } from '../util/ids.js';
import { lastFour } from '../util/phone.js';
import { interpretReport } from '../domain/interpret.js';

/**
 * Everything that must be decided before a report is persisted, kept in one
 * place so the SQLite and Postgres drivers cannot drift apart on the things
 * that matter: the capability token, the PIN gate, and the interpretation the
 * patient will actually read.
 */
export function prepareReport({ patient, measurements }) {
  const pin = patient?.phone ? lastFour(patient.phone) : null;

  return {
    interpretation: interpretReport(measurements, patient ?? {}),
    token: reportToken(),
    pinHash: pin ? sha256(pin) : null,
    expiresAt: config.links.ttlHours > 0
      ? new Date(Date.now() + config.links.ttlHours * 3600_000).toISOString()
      : null,
  };
}
