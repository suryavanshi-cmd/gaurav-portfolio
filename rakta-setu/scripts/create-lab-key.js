#!/usr/bin/env node
/**
 * Issues a lab API key for the folder watcher to push reports with.
 *
 *   node scripts/create-lab-key.js <lab-user-uuid> "Pune lab PC"
 *
 * The key is shown once and only its SHA-256 is stored, so it cannot be
 * recovered later — if it is lost, revoke it and issue another.
 */
import crypto from 'node:crypto';
import { config } from '../src/config.js';
import { supabase } from '../src/billing/supabaseClient.js';
import { sha256 } from '../src/util/ids.js';

const [labId, name] = process.argv.slice(2);

if (!labId) {
  console.error('Usage: node scripts/create-lab-key.js <lab-user-uuid> [name]');
  console.error('\nThe uuid is the id from public.users — the Supabase Auth account for this lab.');
  process.exit(1);
}
if (!config.supabase.enabled) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

const key = `rsk_live_${crypto.randomBytes(24).toString('base64url')}`;

const { error } = await supabase().from('lab_api_keys').insert({
  lab_id: labId,
  name: name || 'lab watcher',
  key_hash: sha256(key),
  key_prefix: key.slice(0, 12),
});

if (error) {
  console.error(`Could not create the key: ${error.message}`);
  if (error.code === '23503') console.error('That lab uuid does not exist in public.users.');
  process.exit(1);
}

const rule = '─'.repeat(64);
console.log(`\n${rule}`);
console.log('  लॅब की तयार · lab API key created');
console.log(rule);
console.log(`\n  ${key}\n`);
console.log('  Put this in the lab PC\'s .env as:');
console.log(`      LAB_API_KEY=${key}`);
console.log(`      REMOTE_INGEST_URL=${config.publicBaseUrl}`);
console.log('\n  Shown once — only its hash is stored. Lost keys are revoked, not recovered.');
console.log(`${rule}\n`);
