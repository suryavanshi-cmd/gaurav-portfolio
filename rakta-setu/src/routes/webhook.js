import express from 'express';
import { config } from '../config.js';
import { log, maskPhone } from '../logger.js';
import { latestReportForPhone } from '../store/index.js';
import { normalisePhone } from '../util/phone.js';
import { sendPlainText } from '../services/whatsapp/index.js';
import { reportUrl } from '../services/ingest.js';

export const webhook = express.Router();

/**
 * Meta calls this once to verify the callback URL, then POSTs every inbound
 * message. Patients reply to the report message surprisingly often ("link
 * उघडत नाही"), so we answer with their most recent link rather than
 * leaving them talking to a silent number.
 */
webhook.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token && token === config.whatsapp.cloud.webhookVerifyToken) {
    log.info('WhatsApp webhook verified');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

webhook.post('/whatsapp', async (req, res) => {
  // Meta retries aggressively on anything but a fast 200.
  res.sendStatus(200);

  try {
    const entries = req.body?.entry ?? [];
    for (const entry of entries) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};

        for (const status of value.statuses ?? []) {
          log.debug(`delivery status ${status.status} for ${status.id}`);
        }

        for (const message of value.messages ?? []) {
          const from = normalisePhone(message.from);
          const text = message.text?.body?.trim() ?? '';
          log.info(`इनकमिंग संदेश · inbound message from ${maskPhone(from)}`);

          const row = from ? await latestReportForPhone(from) : null;
          const reply = row
            ? `नमस्कार! तुमचा अहवाल इथे पाहू शकता 👇\n${reportUrl(row.token)}\n\nपान उघडल्यावर तुमच्या मोबाईल नंबरचे शेवटचे ४ अंक टाका.\n\nअडचण असल्यास ${config.lab.name} ला ${config.lab.phone} या नंबरवर फोन करा.`
            : `नमस्कार! या नंबरवर आम्हाला तुमचा अहवाल सापडला नाही.\n\nकृपया ${config.lab.name} ला ${config.lab.phone} या नंबरवर संपर्क साधा.`;

          if (from && text) await sendPlainText({ to: from, text: reply });
        }
      }
    }
  } catch (err) {
    log.error(`webhook handling failed: ${err.message}`);
  }
});
