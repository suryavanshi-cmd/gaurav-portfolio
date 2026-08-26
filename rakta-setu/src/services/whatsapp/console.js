import { log } from '../../logger.js';

/**
 * Development driver. Prints the exact message that would go out, so the whole
 * pipeline can be exercised end-to-end without a Meta or Twilio account —
 * and without any risk of messaging a real patient while testing.
 */
export async function sendText({ to, text }) {
  const rule = '─'.repeat(66);
  console.log(`\n${rule}\n📱  WhatsApp → ${to}   [driver: console — nothing was actually sent]\n${rule}\n${text}\n${rule}\n`);
  log.info('console driver: message rendered, not sent');
  return { providerMessageId: `console-${Date.now()}` };
}

export const sendReportTemplate = ({ to, message }) => sendText({ to, text: message });
