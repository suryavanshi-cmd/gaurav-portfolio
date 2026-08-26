import 'dotenv/config';
import path from 'node:path';

const bool = (v, dflt = false) =>
  v === undefined || v === '' ? dflt : /^(1|true|yes|on)$/i.test(String(v).trim());

const int = (v, dflt) => {
  const n = Number.parseInt(v ?? '', 10);
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

  return problems;
}
