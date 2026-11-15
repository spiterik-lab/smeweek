// One-time organiser password reset.  Run: node tests/admin-reset-test.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import crypto from 'node:crypto';
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const root = new URL('..', import.meta.url).pathname;
const data = join(mkdtempSync(join(tmpdir(), 'smec-rs-')), 'data'); mkdirSync(data);
const port = 9000 + Math.floor(Math.random() * 40);
const php = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', root], { env: { ...process.env, SMEWEEK_DATA_DIR: data, SMEWEEK_ADMIN_HASH: sha('old-organiser'), SMEWEEK_RESET_HASH: sha('ABCDE-FGHJK') }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 700));
const api = async (action, body) => (await fetch(`http://127.0.0.1:${port}/api.php?action=${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
let pass = 0, failN = 0; const ok = (c, name, extra = '') => { if (c) pass++; else { failN++; console.log('FAIL', name, extra); } };
try {
  ok((await api('admin', { key: 'old-organiser', op: 'check' })).ok, 'old password works before');
  ok(!(await api('admin_reset', { code: 'WRONG-CODE1', password: 'a-new-password' })).ok, 'wrong code refused');
  ok(!(await api('admin_reset', { code: 'ABCDE-FGHJK', password: 'short' })).ok, 'short password refused');
  ok((await api('admin', { key: 'old-organiser', op: 'check' })).ok, 'nothing changed by failed tries');
  ok((await api('admin_reset', { code: ' abcde-fghjk ', password: 'a-new-password' })).ok, 'right code sets the password');
  ok((await api('admin', { key: 'a-new-password', op: 'check' })).ok, 'new password works');
  ok(!(await api('admin', { key: 'old-organiser', op: 'check' })).ok, 'old password no longer works');
  ok(!(await api('admin_reset', { code: 'ABCDE-FGHJK', password: 'another-password' })).ok, 'code cannot be used twice');
  ok((await api('admin', { key: 'a-new-password', op: 'check' })).ok, 'password unchanged by second try');
} finally { php.kill(); }
console.log(`${pass} passed, ${failN} failed`); process.exit(failN ? 1 : 0);
