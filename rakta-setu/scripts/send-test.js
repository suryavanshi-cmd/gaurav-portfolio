#!/usr/bin/env node
/**
 * Sends one test WhatsApp message through whichever driver is configured.
 * Run this before going live — it surfaces template-approval and token
 * problems immediately, instead of during a real patient's report.
 *
 *   node scripts/send-test.js 9822012345
 */
import { config } from '../src/config.js';
import { normalisePhone, displayPhone } from '../src/util/phone.js';
import { sendPlainText } from '../src/services/whatsapp/index.js';

const raw = process.argv[2];
if (!raw) {
  console.error('Usage: node scripts/send-test.js <phone number>');
  process.exit(1);
}

const to = normalisePhone(raw);
if (!to) {
  console.error(`"${raw}" does not look like a dialable mobile number.`);
  process.exit(1);
}

console.log(`Driver : ${config.whatsapp.driver}`);
console.log(`To     : ${displayPhone(to)}`);

const text = `नमस्कार! ही ${config.lab.name} कडून आलेली चाचणी सूचना आहे.\n\nतुम्हाला हा संदेश दिसत असेल, तर रक्त-सेतू व्हॉट्सॲप जोडणी व्यवस्थित काम करत आहे. ✅`;

try {
  const result = await sendPlainText({ to, text });
  console.log(`\n✅ Sent. Provider message id: ${result.providerMessageId}`);
  if (config.whatsapp.driver === 'console') {
    console.log('   (console driver — nothing actually left this machine)');
  }
} catch (err) {
  console.error(`\n❌ Send failed: ${err.message}`);
  if (err.detail) console.error(JSON.stringify(err.detail, null, 2));
  console.error('\nSee docs/WHATSAPP.md for the most common causes.');
  process.exit(1);
}
