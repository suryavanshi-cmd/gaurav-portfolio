import chokidar from 'chokidar';
import path from 'node:path';
import { config } from '../config.js';
import { log } from '../logger.js';
import { isSupported } from '../parsers/index.js';
import { ingestFile, ensureDirs } from '../services/ingest.js';

/**
 * Watches the analyzer's output folder.
 *
 * Two things make this reliable in a real lab:
 *  1. `awaitWriteFinish` — the analyzer writes the PDF in chunks, and reading
 *     it too early yields a truncated file. We wait for the size to stop
 *     changing before touching it.
 *  2. A serial queue — two reports finishing at once must not interleave
 *     WhatsApp sends and confuse the ordering staff see.
 */
export function startWatcher() {
  ensureDirs();

  const queue = [];
  let draining = false;

  async function drain() {
    if (draining) return;
    draining = true;
    while (queue.length > 0) {
      const filePath = queue.shift();
      try {
        await ingestFile(filePath);
      } catch (err) {
        log.error(`Unhandled ingest error for ${path.basename(filePath)}: ${err.stack || err.message}`);
      }
    }
    draining = false;
  }

  const watcher = chokidar.watch(config.watch.dir, {
    ignoreInitial: false,
    depth: 2,
    awaitWriteFinish: {
      stabilityThreshold: config.watch.stabilityMs,
      pollInterval: 250,
    },
    // Network shares (a very common setup for analyzer PCs) do not emit
    // reliable inotify events, so poll them.
    usePolling: process.env.WATCH_POLLING === 'true',
    interval: 1000,
  });

  watcher.on('add', (filePath) => {
    const base = path.basename(filePath);
    if (base.startsWith('.') || base.startsWith('~$')) return;
    if (!isSupported(filePath)) {
      log.debug(`ignoring unsupported file: ${base}`);
      return;
    }
    log.info(`फाइल आढळली · queued ${base}`);
    queue.push(filePath);
    drain();
  });

  watcher.on('error', (err) => log.error(`Watcher error: ${err.message}`));
  watcher.on('ready', () => {
    log.info(`फोल्डरवर लक्ष ठेवत आहे · watching ${config.watch.dir}`);
  });

  return watcher;
}
