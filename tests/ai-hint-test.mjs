// Checks that typed profile text is read by the AI into tick-box options, validated, and that saving
// still works when the AI is off or broken.  Uses a stand-in for the AI service.  Run: node tests/ai-hint-test.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';

const root = new URL('..', import.meta.url).pathname;
const data = join(mkdtempSync(join(tmpdir(), 'smec-ai-')), 'data'); mkdirSync(data);
let calls = 0, mode = 'good', lastPrompt = '';
const answers = {
  good: '{"give":["training","nonsense"],"get":["support"],"topics":["hr","zzz"],"sector":"Education, training & research"}',
  junk: 'Sorry, I cannot do that.',
};
const ai = http.createServer((req, res) => { const ch = []; req.on('data', c => ch.push(c)); req.on('end', () => {
  calls++; lastPrompt = JSON.parse(Buffer.concat(ch)).messages[0].content;
  if (mode === 'down') { res.writeHead(500); return res.end('{}'); }
  res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ content: [{ type: 'text', text: answers[mode] }] })); }); });
await new Promise(r => ai.listen(0, '127.0.0.1', r));
const port = 8950 + Math.floor(Math.random() * 40);
const php = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', root], { env: { ...process.env, SMEWEEK_DATA_DIR: data, SMEWEEK_MAIL_LOG: '1',
  SMEWEEK_AI_URL: `http://127.0.0.1:${ai.address().port}/`, SMEWEEK_ADMIN_HASH: crypto.createHash('sha256').update('test-organiser').digest('hex') }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 700));
const api = async (action, body) => (await fetch(`http://127.0.0.1:${port}/api.php?action=${action}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined)).json();
let pass = 0, failN = 0;
const ok = (c, name, extra = '') => { if (c) pass++; else { failN++; console.log('FAIL', name, extra); } };
const me = async () => (await api('list')).people.find(p => p.name === 'Tina Typed');
try {
  const r = await api('register', { email: 'tina@x.example', password: 'password-tina' });
  const T = { id: r.id, token: r.token };
  const base = { ...T, consent: true, name: 'Tina Typed', company: 'Coach Co', sector: 'Other', sector_other: 'Executive coaching',
    role: 'Founder', work: 'We run AI workshops for HR teams and want a grant to grow', interests: ['network'], topics: [] };
  // AI off: saves, no hint, no call
  ok((await api('profile', base)).ok && calls === 0 && !(await me()).hint, 'saves with AI off, nothing sent');
  ok((await api('admin', { key: 'test-organiser', op: 'setkey', api_key: 'sk-ant-test-key-000000000000' })).ai, 'AI switched on');
  ok((await api('profile', base)).ok && calls === 1, 'typed text read once');
  let h = (await me()).hint;
  ok(h && h.give.join() === 'training' && h.get.join() === 'support' && h.topics.join() === 'hr' && h.sector === 'Education, training & research', 'only valid options kept', JSON.stringify(h));
  ok(lastPrompt.includes('AI workshops for HR teams') && !lastPrompt.includes('tina@x.example') && !lastPrompt.includes('Tina Typed'), 'prompt has the typed text, not the name or email');
  await api('profile', base); ok(calls === 1, 'unchanged text is not sent again');
  // ticking the option yourself removes it from the hint; a listed sector drops the sector hint
  await api('profile', { ...base, sector: 'Health & care', sector_other: '', interests: ['network', 'training:give'] });
  h = (await me()).hint; ok(calls === 2 && h.give.length === 0 && h.sector === '', 'ticked options and listed sector are not hinted', JSON.stringify(h));
  mode = 'junk'; ok((await api('profile', { ...base, work: 'Something new' })).ok && !(await me()).hint, 'unreadable AI answer: saved, no hint');
  mode = 'down'; ok((await api('profile', { ...base, work: 'Something else' })).ok && !(await me()).hint, 'AI down: saved, no hint');
  mode = 'good'; const before = calls; await api('profile', { ...base, work: 'Something else' }); ok(calls === before + 1 && (await me()).hint, 'tries again on the next save');
  await api('profile', { ...base, role: '', work: '', sector: 'Health & care', sector_other: '' }); ok(!(await me()).hint, 'no typed text, no hint');
} finally { php.kill(); ai.close(); }
console.log(`${pass} passed, ${failN} failed`); process.exit(failN ? 1 : 0);
