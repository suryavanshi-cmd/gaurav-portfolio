import { config } from '../../config.js';
import { log, maskPhone } from '../../logger.js';

const GRAPH_VERSION = 'v21.0';

function endpoint() {
  return `https://graph.facebook.com/${GRAPH_VERSION}/${config.whatsapp.cloud.phoneNumberId}/messages`;
}

async function post(payload) {
  const res = await fetch(endpoint(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.whatsapp.cloud.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.error?.message || `WhatsApp Cloud API returned ${res.status}`);
    err.status = res.status;
    err.detail = body?.error;
    // 4xx other than 429 are permanent — a bad template name will never succeed on retry.
    err.retryable = res.status === 429 || res.status >= 500;
    throw err;
  }
  return body;
}

/**
 * Business-initiated messages must use an approved template — a patient who has
 * never messaged the lab is outside the 24-hour customer service window, so a
 * plain text message would be rejected. See docs/WHATSAPP.md for the template
 * this expects and how to get it approved in Marathi.
 *
 * Template body placeholders, in order:
 *   {{1}} patient name    {{2}} lab name    {{3}} one-line Marathi summary
 * Plus a dynamic URL button whose suffix is the report token.
 */
export async function sendReportTemplate({ to, patientName, labName, summary, token }) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: config.whatsapp.cloud.templateName,
      language: { code: config.whatsapp.cloud.templateLang },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: patientName || 'रुग्ण' },
            { type: 'text', text: labName },
            { type: 'text', text: truncate(summary, 900) },
          ],
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: token }],
        },
      ],
    },
  };

  const body = await post(payload);
  const id = body?.messages?.[0]?.id ?? null;
  log.info(`व्हॉट्सॲप पाठवलं · cloud template sent to ${maskPhone(to)} (${id})`);
  return { providerMessageId: id };
}

/** Free-form reply — only valid inside the 24h window opened by a patient message. */
export async function sendText({ to, text }) {
  const body = await post({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: true, body: truncate(text, 4000) },
  });
  return { providerMessageId: body?.messages?.[0]?.id ?? null };
}

function truncate(str, max) {
  const s = String(str ?? '');
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}
