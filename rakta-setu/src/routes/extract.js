import express from 'express';
import { config } from '../config.js';
import { log, maskName, maskPhone } from '../logger.js';
import { randomId } from '../util/ids.js';
import { normalisePhone } from '../util/phone.js';
import { requireUser } from '../billing/auth.js';
import { reserve, settle, InsufficientCredit } from '../billing/credits.js';
import { assertUnderCap, recordSpend, PlatformCapExceeded } from '../billing/platformCap.js';
import {
  estimateTokens, estimatePdfPages, costUsd, usdToInr, billedTokens, tokensToInr, ratesFor,
} from '../billing/pricing.js';
import { extractFromPdf, countInputTokens, ExtractionFailed } from '../services/extraction.js';
import { interpretReport } from '../domain/interpret.js';
import { createReport } from '../services/reports.js';
import { sendReportLink } from '../services/whatsapp/index.js';
import { reportUrl } from '../services/ingest.js';

export const extractRoutes = express.Router();

/**
 * POST /api/extract
 *
 * Metered, AI-backed extraction of a scanned blood report.
 *
 *   Content-Type: application/pdf
 *   Authorization: Bearer <supabase jwt>
 *   Body: the raw PDF bytes
 *   ?deliver=true  also stores the report and WhatsApps the patient
 *
 * The billing sequence is: platform cap → estimate → hold → call → settle.
 * The hold is the important part. Checking a balance and then spending is a
 * race — two concurrent uploads both pass the check and the account
 * overdraws. Reserving up front makes concurrent requests safe, and the
 * settle step refunds the difference between estimate and actual.
 */
extractRoutes.post(
  '/',
  requireUser,
  express.raw({ type: ['application/pdf', 'application/octet-stream'], limit: config.billing.maxUploadBytes }),
  async (req, res) => {
    const pdf = req.body;
    const pdfId = randomId(12);

    if (!Buffer.isBuffer(pdf) || pdf.length === 0) {
      return res.status(400).json({
        error: 'कृपया PDF फाइल पाठवा.',
        error_en: 'Send the raw PDF bytes with Content-Type: application/pdf',
      });
    }
    if (pdf.subarray(0, 5).toString('latin1') !== '%PDF-') {
      return res.status(400).json({ error: 'ही PDF फाइल दिसत नाही.', error_en: 'Not a PDF file' });
    }

    // ── 1. platform-wide backstop, checked before anything is spent ────────
    try {
      await assertUnderCap();
    } catch (err) {
      if (err instanceof PlatformCapExceeded) {
        return res.status(503).json({
          error: 'सेवा तात्पुरती बंद आहे. कृपया नंतर प्रयत्न करा.',
          error_en: 'Platform monthly spend cap reached; extraction is disabled until it resets.',
          code: 'PLATFORM_CAP_REACHED',
          period: err.period,
        });
      }
      throw err;
    }

    // ── 2. size the job ────────────────────────────────────────────────────
    const pageCount = estimatePdfPages(pdf);
    const rates = ratesFor(config.billing.model);

    if (pageCount > rates.maxPdfPages) {
      return res.status(413).json({
        error: `हा अहवाल खूप मोठा आहे (${pageCount} पानं).`,
        error_en: `${pageCount} pages exceeds the ${rates.maxPdfPages}-page limit for ${config.billing.model}.`,
        code: 'TOO_MANY_PAGES',
      });
    }

    const pdfBase64 = pdf.toString('base64');

    // An exact count of the real request beats a per-page guess, and costs
    // nothing. Falls back to the heuristic if the endpoint is unreachable.
    const exactInputTokens = await countInputTokens(pdfBase64);
    const estimate = estimateTokens({ pageCount, exactInputTokens });

    // ── 3. reserve, or refuse with a 402 ───────────────────────────────────
    let hold;
    try {
      hold = await reserve({ userId: req.user.id, tokens: estimate.totalEstimate, pdfId });
    } catch (err) {
      if (err instanceof InsufficientCredit) {
        return res.status(402).json({
          error: 'तुमचे क्रेडिट कमी आहेत. कृपया रिचार्ज करा.',
          error_en: 'Insufficient credit for this extraction.',
          code: 'INSUFFICIENT_CREDIT',
          required_tokens: err.required,
          available_tokens: err.available,
          shortfall_tokens: err.shortfallTokens,
          topup_inr: Math.max(config.razorpay.minTopUpInr, err.shortfallInr),
          display: {
            mr: `या अहवालासाठी अंदाजे ${err.required.toLocaleString('en-IN')} क्रेडिट लागतील, `
              + `पण तुमच्याकडे ${err.available.toLocaleString('en-IN')} शिल्लक आहेत. `
              + `कृपया किमान ₹${Math.max(config.razorpay.minTopUpInr, err.shortfallInr)} रिचार्ज करा.`,
          },
        });
      }
      throw err;
    }

    // ── 4. do the work, then always settle the hold ────────────────────────
    try {
      const result = await extractFromPdf(pdfBase64);

      const usd = costUsd({ ...result.usage, model: result.model });
      const inr = usdToInr(usd);
      const billed = billedTokens(result.usage);

      const settled = await settle({
        holdId: hold.holdId,
        status: 'success',
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        billed,
        costInr: inr,
        costUsd: usd,
        model: result.model,
      });

      await recordSpend(usd);

      log.info(
        `extraction ${pdfId}: ${result.measurements.length} results, `
        + `${result.usage.inputTokens}+${result.usage.outputTokens} tokens, `
        + `charged ${billed} (est ${estimate.totalEstimate}), balance ${settled.balanceTokens}`,
      );

      // ── the existing pipeline, unchanged ────────────────────────────────
      const interpretation = interpretReport(result.measurements, result.patient);
      const delivery = await maybeDeliver({ req, result, interpretation, pdfId });

      return res.json({
        ok: true,
        pdf_id: pdfId,
        report: {
          patient: result.patient,
          measurements: result.measurements,
          interpretation,
          unreadable: result.unreadable,
        },
        delivery,
        billing: {
          model: result.model,
          input_tokens: result.usage.inputTokens,
          output_tokens: result.usage.outputTokens,
          estimated_tokens: estimate.totalEstimate,
          estimate_was_exact: estimate.exact,
          charged_tokens: billed,
          charged_inr: Number(tokensToInr(billed).toFixed(4)),
          actual_cost_inr: Number(inr.toFixed(4)),
          balance_tokens: settled.balanceTokens,
          balance_inr: Number(settled.balanceInr.toFixed(2)),
        },
      });
    } catch (err) {
      // The call may have consumed tokens before failing. Charge the user
      // nothing — they got no result — but record the real platform spend so
      // the monthly cap still reflects money actually spent.
      const usage = err.usage ?? { inputTokens: 0, outputTokens: 0 };
      const usd = usage.inputTokens || usage.outputTokens
        ? costUsd({ ...usage, model: config.billing.model })
        : 0;

      await settle({
        holdId: hold.holdId,
        status: 'failed',
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        billed: 0,
        costInr: usdToInr(usd),
        costUsd: usd,
        model: config.billing.model,
        error: err.message,
      }).catch((e) => log.error(`CRITICAL: could not settle hold ${hold.holdId}: ${e.message}`));

      if (usd > 0) await recordSpend(usd).catch(() => {});

      if (err instanceof ExtractionFailed) {
        log.warn(`extraction ${pdfId} failed [${err.code}]: ${err.message}`);
        const status = err.code === 'RATE_LIMIT' ? 429 : err.code === 'UNREADABLE' ? 422 : 502;
        return res.status(status).json({
          ok: false,
          error: err.code === 'UNREADABLE'
            ? 'हा स्कॅन स्पष्ट नाही. कृपया अधिक स्पष्ट प्रत पाठवा.'
            : 'अहवाल वाचता आला नाही. तुमचे क्रेडिट वापरले गेले नाहीत.',
          error_en: err.message,
          code: err.code,
          charged_tokens: 0,
        });
      }

      log.error(`extraction ${pdfId} crashed: ${err.stack || err.message}`);
      return res.status(500).json({
        ok: false,
        error: 'अडचण आली. तुमचे क्रेडिट वापरले गेले नाहीत.',
        charged_tokens: 0,
      });
    }
  },
);

/**
 * Optional hand-off to the existing report pipeline: store the report and
 * WhatsApp the patient their Marathi link, exactly as the folder watcher does.
 */
async function maybeDeliver({ req, result, interpretation, pdfId }) {
  if (req.query.deliver !== 'true') return { attempted: false };

  const phone = normalisePhone(result.patient.phone);
  if (!phone) {
    return { attempted: true, sent: false, reason: 'NO_PHONE', error_en: 'No usable phone number on the report' };
  }

  try {
    const report = createReport({
      patient: { ...result.patient, phone },
      measurements: result.measurements,
      sourceFile: `ai-extract:${pdfId}`,
      sourceHash: null,
      labNo: result.patient.labNo,
      collectedAt: result.patient.collectedAt,
      reportedAt: result.patient.reportedAt,
      doctor: result.patient.doctor,
    });

    const url = reportUrl(report.token);
    await sendReportLink({ report, url, labName: config.lab.name });
    log.info(`ai-extract ${pdfId} delivered to ${maskName(result.patient.name)} ${maskPhone(phone)}`);
    return { attempted: true, sent: true, report_url: url };
  } catch (err) {
    log.error(`delivery failed for ${pdfId}: ${err.message}`);
    return { attempted: true, sent: false, reason: 'SEND_FAILED', error_en: err.message };
  }
}
