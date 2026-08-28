import { config } from './config.js';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const threshold = LEVELS[config.logLevel] ?? LEVELS.info;

/**
 * Phone numbers and patient names must never reach the log file in full —
 * this repo is public and lab staff routinely paste logs into support chats.
 */
export function maskPhone(phone) {
  const s = String(phone ?? '');
  if (s.length < 4) return '****';
  return `${'*'.repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`;
}

export function maskName(name) {
  const s = String(name ?? '').trim();
  if (!s) return '(अनामिक)';
  return `${s.slice(0, 1)}${'*'.repeat(Math.max(1, s.length - 1))}`;
}

function emit(level, msg, extra) {
  if (LEVELS[level] > threshold) return;
  const line = `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} ${msg}`;
  if (extra !== undefined) console[level === 'debug' ? 'log' : level](line, extra);
  else console[level === 'debug' ? 'log' : level](line);
}

export const log = {
  error: (m, e) => emit('error', m, e),
  warn: (m, e) => emit('warn', m, e),
  info: (m, e) => emit('info', m, e),
  debug: (m, e) => emit('debug', m, e),
};
