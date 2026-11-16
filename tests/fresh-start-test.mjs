// One-time fresh start: old data is moved to a private backup, settings are kept.  Run: node tests/fresh-start-test.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import crypto from 'node:crypto';
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const root = new URL('..', import.meta.url).pathname;
const data = join(mkdtempSync(join(tmpdir(), 'smec-fs-')), 'data'); mkdirSync(data); mkdirSync(data + '-v1');
const port = 9100 + Math.floor(Math.random() * 40);
const start = id => spawn('php', ['-S', `127.0.0.1:${port}`, '-t', root], { env: { ...process.env, SMEWEEK_DATA_DIR: data, SMEWEEK_MAIL_LOG: '1', SMEWEEK_FRESH_ID: id, SMEWEEK_ADMIN_HASH: sha('test-organiser') }, stdio: 'ignore' });
const wait = ms => new Promise(r => setTimeout(r, ms));
const api = async (action, body) => (await fetch(`http://127.0.0.1:${port}/api.php?action=${action}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined)).json();
let pass = 0, failN = 0; const ok = (c, name, extra = '') => { if (c) pass++; else { failN++; console.log('FAIL', name, extra); } };
// A Version 1 profile, so the first run migrates it.
writeFileSync(data + '-v1/people.json', JSON.stringify({ v: 3, people: { aaaaaaaaaaaa: { name: 'Legacy Lou', company: 'Old Co', sector: 'Other', interests: ['network'], token_hash: sha('legacytoken'), at: 1, created: 1, consent_at: 1, consent_v: 'x' } } }));
let php = start('one'); await wait(700);
let A, vBefore;
try {
  let l = await api('list'); ok(l.people.length === 1, 'new install: Version 1 profile migrated, nothing cleared');
  const r = await api('register', { email: 'ann@x.example', password: 'password-ann' }); A = { id: r.id, token: r.token };
  ok((await api('profile', { ...A, consent: true, name: 'Ann', company: 'A Co', sector: 'Health & care', interests: ['network'] })).ok, 'profile made');
  ok((await api('admin', { key: 'test-organiser', op: 'setkey', api_key: 'sk-ant-test-key-000000000000' })).ok, 'setting saved');
  l = await api('list'); vBefore = l.v; ok(l.people.length === 2, 'two people before');
} finally { php.kill(); }
await wait(300); php = start('two'); await wait(700);
try {
  const l = await api('list'); ok(l.people.length === 0 && l.v > vBefore, 'after fresh start: empty room, version moved on', JSON.stringify(l).slice(0, 120));
  ok(!(await api('sync', A)).ok, 'old sign-in no longer works');
  ok(!(await api('login', { email: 'ann@x.example', password: 'password-ann' })).ok, 'old account is gone');
  ok(!(await api('claim', { id: 'aaaaaaaaaaaa', token: 'legacytoken' })).ok, 'Version 1 phone is not recognised');
  ok((await api('admin', { key: 'test-organiser', op: 'check' })).ai === true, 'settings kept');
  const b = readdirSync(data).filter(f => f.startsWith('backup-before-fresh-start-two-'));
  ok(b.length === 1 && JSON.parse(readFileSync(join(data, b[0], 'people.json'), 'utf8')).people[A.id].name === 'Ann' && existsSync(join(data, b[0], 'accounts.json')), 'old data is in the backup folder');
  ok(readFileSync(data + '-v1/people.json', 'utf8').includes('Legacy Lou'), 'Version 1 folder untouched');
  const r = await api('register', { email: 'ann@x.example', password: 'password-ann2' }); ok(r.ok && r.isNew, 'the same person can sign up again from scratch');
  const B = { id: r.id, token: r.token };
  await api('profile', { ...B, consent: true, name: 'Ann', company: 'A Co', sector: 'Health & care', interests: ['network'] });
  ok((await api('list')).people.length === 1, 'new sign-ups work');
} finally { php.kill(); }
await wait(300); php = start('two'); await wait(700);
try { ok((await api('list')).people.length === 1 && readdirSync(data).filter(f => f.startsWith('backup-')).length === 1, 'runs once only: later visits clear nothing'); } finally { php.kill(); }
console.log(`${pass} passed, ${failN} failed`); process.exit(failN ? 1 : 0);
