import express from 'express';
import { config } from '../config.js';
import { log } from '../logger.js';
import { safeEqual } from '../util/ids.js';
import { displayPhone } from '../util/phone.js';
import {
  getReportByToken, verifyPin, isExpired, recordOpen,
  recordQuestion, listQuestions, listRecent, audit,
} from '../services/reports.js';
import { answerQuestion } from '../services/ai.js';
import { resendReport } from '../services/ingest.js';

export const api = express.Router();

/** Small in-memory limiter — enough for a single-lab deployment. */
function rateLimiter({ windowMs, max, key = (req) => req.ip }) {
  const hits = new Map();
  setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [k, times] of hits) {
      const kept = times.filter((t) => t > cutoff);
      if (kept.length) hits.set(k, kept); else hits.delete(k);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const k = key(req);
    const now = Date.now();
    const times = (hits.get(k) ?? []).filter((t) => t > now - windowMs);
    if (times.length >= max) {
      return res.status(429).json({ error: 'खूप जास्त विनंत्या. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.' });
    }
    times.push(now);
    hits.set(k, times);
    return next();
  };
}

const unlockLimiter = rateLimiter({ windowMs: 10 * 60_000, max: 12, key: (req) => `${req.ip}:${req.params.token}` });
const askLimiter = rateLimiter({ windowMs: 60_000, max: 10 });

/** Resolves the token and enforces expiry. Attaches `req.report`. */
function loadReport(req, res, next) {
  const report = getReportByToken(req.params.token);
  if (!report) {
    return res.status(404).json({ error: 'हा अहवाल सापडला नाही. कृपया प्रयोगशाळेशी संपर्क साधा.' });
  }
  if (isExpired(report)) {
    return res.status(410).json({ error: 'या लिंकची मुदत संपली आहे. नवीन लिंकसाठी प्रयोगशाळेशी संपर्क साधा.' });
  }
  req.report = report;
  return next();
}

/** Checks the PIN carried in the body or the `x-report-pin` header. */
function requirePin(req, res, next) {
  const pin = req.body?.pin ?? req.get('x-report-pin');
  if (!verifyPin(req.report, pin)) {
    audit(req.report.id, 'report.pin_failed');
    return res.status(401).json({ error: 'दिलेले शेवटचे ४ अंक जुळत नाहीत. कृपया पुन्हा तपासा.' });
  }
  return next();
}

/**
 * Public pre-auth endpoint. Deliberately returns no health data — only
 * enough for the page to render its unlock prompt.
 */
api.get('/report/:token/meta', loadReport, (req, res) => {
  const { report } = req;
  const firstName = (report.patient.name || '').split(/\s+/)[0] || null;
  res.json({
    labName: config.lab.name,
    labPhone: config.lab.phone,
    patientFirstName: firstName,
    requiresPin: config.links.requireVerification && Boolean(report.pinHash),
    phoneHint: report.patient.phone ? displayPhone(report.patient.phone).replace(/\d(?=\d{4})/g, '•') : null,
    reportedAt: report.reportedAt,
    aiEnabled: config.ai.enabled,
  });
});

/** Full report, gated by the PIN. */
api.post('/report/:token', unlockLimiter, loadReport, requirePin, (req, res) => {
  const { report } = req;
  recordOpen(report.id);
  res.json({
    labName: config.lab.name,
    labPhone: config.lab.phone,
    labCity: config.lab.city,
    aiEnabled: config.ai.enabled,
    report: {
      labNo: report.labNo,
      collectedAt: report.collectedAt,
      reportedAt: report.reportedAt,
      doctor: report.doctor,
      patient: {
        name: report.patient.name,
        age: report.patient.age,
        sex: report.patient.sex,
      },
      interpretation: report.interpretation,
    },
    history: listQuestions(report.id),
  });
});

/** Marathi Q&A — voice or typed. */
api.post('/report/:token/ask', askLimiter, loadReport, requirePin, async (req, res) => {
  const question = String(req.body?.question || '').trim().slice(0, 500);
  if (!question) {
    return res.status(400).json({ error: 'कृपया प्रश्न लिहा किंवा बोला.' });
  }

  const history = Array.isArray(req.body?.history)
    ? req.body.history
      .filter((h) => h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string')
      .slice(-6)
      .map((h) => ({ role: h.role, content: h.content.slice(0, 2000) }))
    : [];

  try {
    const { answer, source } = await answerQuestion({ report: req.report, question, history });
    recordQuestion({ reportId: req.report.id, question, answer, source });
    return res.json({ answer, source });
  } catch (err) {
    log.error(`ask failed: ${err.message}`);
    return res.status(500).json({ error: 'उत्तर देताना अडचण आली. कृपया पुन्हा प्रयत्न करा.' });
  }
});

// ─────────────────────────── staff endpoints ───────────────────────────

function requireAdmin(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!config.adminToken || !safeEqual(token, config.adminToken)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}

api.get('/admin/reports', requireAdmin, (req, res) => {
  const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
  res.json({ reports: listRecent(limit) });
});

api.post('/admin/reports/:id/resend', requireAdmin, async (req, res) => {
  try {
    const result = await resendReport(req.params.id);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});
