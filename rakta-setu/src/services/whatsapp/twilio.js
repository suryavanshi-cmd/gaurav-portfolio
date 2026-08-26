import { config } from '../../config.js';
import { log, maskPhone } from '../../logger.js';

/**
 * Twilio's WhatsApp API takes plain text, so the whole Marathi message body is
 * sent as-is. Outside the 24h window Twilio also requires a pre-approved
 * template, but it matches on the message body rather than a template name.
 */
export async function sendText({ to, text }) {
  const { accountSid, authToken, from } = config.whatsapp.twilio;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const form = new URLSearchParams({
    To: to.startsWith('whatsapp:') ? to : `whatsapp:+${String(to).replace(/^\+/, '')}`,
    From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
    Body: text,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.message || `Twilio returned ${res.status}`);
    err.status = res.status;
    err.detail = body;
    err.retryable = res.status === 429 || res.status >= 500;
    throw err;
  }

  log.info(`व्हॉट्सॲप पाठवलं · twilio message sent to ${maskPhone(to)} (${body.sid})`);
  return { providerMessageId: body.sid ?? null };
}

export const sendReportTemplate = ({ to, message }) => sendText({ to, text: message });
