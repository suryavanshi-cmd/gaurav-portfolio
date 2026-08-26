import 'dotenv/config';
import path from 'node:path';

const bool = (v, dflt = false) =>
  v === undefined || v === '' ? dflt : /^(1|true|yes|on)$/i.test(String(v).trim());

const int = (v, dflt) => {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) ? n : dflt;
};

const num = (v, dflt) => {
  const n = Number.parseFloat(v ?? '');
  return Number.isFinite(n) ? n : dflt;
};

const abs = (p) => path.resolve(process.cwd(), p);

export const config = {
  port: int(process.env.PORT, 3000),
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/+$/, ''),
  logLevel: process.env.LOG_LEVEL || 'info',

  lab: {
    name: process.env.LAB_NAME || 'रक्त-सेतू प्रयोगशाळा',
    phone: process.env.LAB_PHONE || '',
    city: process.env.LAB_CITY || '',
  },

  watch: {
    dir: abs(process.env.WATCH_DIR || './inbox'),
    archiveDir: abs(process.env.ARCHIVE_DIR || './archive'),
    failedDir: abs(process.env.FAILED_DIR || './failed'),
    stabilityMs: int(process.env.WATCH_STABILITY_MS, 4000),
  },

  links: {
    ttlHours: int(process.env.LINK_TTL_HOURS, 720),
    requireVerification: bool(process.env.REQUIRE_PATIENT_VERIFICATION, true),
  },

  whatsapp: {
    driver: (process.env.WHATSAPP_DRIVER || 'console').toLowerCase(),
    defaultCountryCode: (process.env.DEFAULT_COUNTRY_CODE || '91').replace(/\D/g, ''),
    cloud: {
      phoneNumberId: process.env.WA_CLOUD_PHONE_NUMBER_ID || '',
      accessToken: process.env.WA_CLOUD_ACCESS_TOKEN || '',
      templateName: process.env.WA_CLOUD_TEMPLATE_NAME || 'rakta_ahwal_taiyar',
      templateLang: process.env.WA_CLOUD_TEMPLATE_LANG || 'mr',
      webhookVerifyToken: process.env.WA_WEBHOOK_VERIFY_TOKEN || '',
    },
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      from: process.env.TWILIO_WHATSAPP_FROM || '',
    },
  },

  ai: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.AI_MODEL || 'claude-opus-5',
    get enabled() {
      return Boolean(this.apiKey);
    },
  },

  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    get enabled() {
      return Boolean(this.url && this.serviceRoleKey);
    },
  },

  billing: {
    // Master switch. Off means the free local extraction path still works and
    // no billing code runs at all.
    get enabled() {
      return bool(process.env.BILLING_ENABLED, false);
    },
    model: process.env.BILLING_MODEL || 'claude-haiku-4-5',

    // ₹10 → 9000 tokens means 900 tokens per rupee.
    tokensPerInr: num(process.env.TOKENS_PER_INR, 900),
    usdToInr: num(process.env.USD_TO_INR_RATE, 88),

    // Pre-flight estimation.
    tokensPerPage: int(process.env.EXTRACTION_TOKENS_PER_PAGE, 1000),
    outputTokensPerPage: int(process.env.EXTRACTION_OUTPUT_TOKENS_PER_PAGE, 400),
    maxOutputTokens: int(process.env.EXTRACTION_MAX_OUTPUT_TOKENS, 8000),
    estimateSafetyMargin: num(process.env.ESTIMATE_SAFETY_MARGIN, 1.2),
    maxUploadBytes: int(process.env.EXTRACTION_MAX_UPLOAD_BYTES, 20 * 1024 * 1024),

    // Backstop only — the real cap belongs in the Anthropic Console.
    monthlySpendCapUsd: num(process.env.MONTHLY_SPEND_CAP_USD, 0),
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    currency: process.env.RAZORPAY_CURRENCY || 'INR',
    minTopUpInr: num(process.env.MIN_TOPUP_INR, 10),
    maxTopUpInr: num(process.env.MAX_TOPUP_INR, 50000),
  },

  adminToken: process.env.ADMIN_TOKEN || '',
  dataDir: abs('./data'),
};

/** Throws early on configuration that would fail silently at runtime. */
export function assertConfig() {
  const problems = [];

  if (!['cloud', 'twilio', 'console'].includes(config.whatsapp.driver)) {
    problems.push(`WHATSAPP_DRIVER must be cloud | twilio | console (got "${config.whatsapp.driver}")`);
  }
  if (config.whatsapp.driver === 'cloud') {
    if (!config.whatsapp.cloud.phoneNumberId) problems.push('WA_CLOUD_PHONE_NUMBER_ID is required for the cloud driver');
    if (!config.whatsapp.cloud.accessToken) problems.push('WA_CLOUD_ACCESS_TOKEN is required for the cloud driver');
  }
  if (config.whatsapp.driver === 'twilio') {
    if (!config.whatsapp.twilio.accountSid) problems.push('TWILIO_ACCOUNT_SID is required for the twilio driver');
    if (!config.whatsapp.twilio.authToken) problems.push('TWILIO_AUTH_TOKEN is required for the twilio driver');
    if (!config.whatsapp.twilio.from) problems.push('TWILIO_WHATSAPP_FROM is required for the twilio driver');
  }
  if (!config.adminToken || config.adminToken === 'change-me-to-a-long-random-string') {
    problems.push('ADMIN_TOKEN is unset or still the placeholder — staff endpoints would be unprotected');
  }
  if (config.publicBaseUrl.startsWith('http://') && !/localhost|127\.0\.0\.1/.test(config.publicBaseUrl)) {
    problems.push('PUBLIC_BASE_URL is plain http — browsers block microphone access, so voice will not work');
  }

  if (config.billing.enabled) {
    if (!config.supabase.enabled) {
      problems.push('BILLING_ENABLED=true but SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — credits cannot be read or written');
    }
    if (!config.ai.apiKey) {
      problems.push('BILLING_ENABLED=true but ANTHROPIC_API_KEY is empty — there is nothing to meter');
    }
    if (!config.razorpay.keyId || !config.razorpay.keySecret) {
      problems.push('BILLING_ENABLED=true but RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set — users cannot top up');
    }
    if (!config.razorpay.webhookSecret) {
      problems.push('RAZORPAY_WEBHOOK_SECRET is empty — webhook signatures cannot be verified, so payment callbacks will all be rejected');
    }
    if (config.billing.tokensPerInr <= 0) {
      problems.push('TOKENS_PER_INR must be greater than zero');
    }
    if (config.billing.monthlySpendCapUsd <= 0) {
      problems.push('MONTHLY_SPEND_CAP_USD is unset — the platform-wide spend backstop is disabled');
    }
    if (config.supabase.serviceRoleKey && config.supabase.serviceRoleKey === config.supabase.anonKey) {
      problems.push('SUPABASE_SERVICE_ROLE_KEY equals SUPABASE_ANON_KEY — the anon key cannot write credits');
    }
  }

  return problems;
}
