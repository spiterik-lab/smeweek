// Reset emails through a mailbox (SMTP), against a stand-in mail server.  Run: node tests/smtp-test.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import net from 'node:net';
import crypto from 'node:crypto';
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const root = new URL('..', import.meta.url).pathname;
const data = join(mkdtempSync(join(tmpdir(), 'smec-sm-')), 'data'); mkdirSync(data);
const mails = [];
const smtp = net.createServer(sock => {
  let st = 'cmd', buf = '', cur = { rcpt: [] }, user = '';
  const say = l => sock.write(l + '\r\n'); say('220 fake ESMTP');
  sock.on('data', d => { buf += d; let i;
    while ((i = buf.indexOf('\r\n')) >= 0) {
      if (st === 'data') { const e = buf.indexOf('\r\n.\r\n'); if (e < 0) return; cur.data = buf.slice(0, e); buf = buf.slice(e + 5); mails.push(cur); cur = { rcpt: [] }; st = 'cmd'; say('250 queued'); continue; }
      const line = buf.slice(0, i); buf = buf.slice(i + 2);
      if (st === 'user') { user = Buffer.from(line, 'base64').toString(); st = 'pass'; say('334 UGFzc3dvcmQ6'); }
      else if (st === 'pass') { st = 'cmd'; say(Buffer.from(line, 'base64').toString() === 'mailbox-secret' && user === 'info@site.example' ? '235 ok' : '535 bad credentials'); }
      else if (/^EHLO/.test(line)) { sock.write('250-fake\r\n250 AUTH LOGIN\r\n'); }
      else if (line === 'AUTH LOGIN') { st = 'user'; say('334 VXNlcm5hbWU6'); }
      else if (/^MAIL FROM/.test(line)) { cur.from = line; say('250 ok'); }
      else if (/^RCPT TO/.test(line)) { cur.rcpt.push(line); say('250 ok'); }
      else if (line === 'DATA') { st = 'data'; say('354 go'); }
      else if (line === 'QUIT') { say('221 bye'); sock.end(); }
      else say('500 what');
    } });
});
await new Promise(r => smtp.listen(0, '127.0.0.1', r));
const sport = smtp.address().port;
const port = 9050 + Math.floor(Math.random() * 40);
const php = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', root], { env: { ...process.env, SMEWEEK_DATA_DIR: data, SMEWEEK_SMTP_PLAIN: '1', SMEWEEK_ADMIN_HASH: sha('test-organiser') }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 700));
const api = async (action, body) => (await fetch(`http://127.0.0.1:${port}/api.php?action=${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const adm = (op, b = {}) => api('admin', { key: 'test-organiser', op, ...b });
let pass = 0, failN = 0; const ok = (c, name, extra = '') => { if (c) pass++; else { failN++; console.log('FAIL', name, extra); } };
try {
  let c = await adm('check'); ok(c.ok && c.mail && c.mail.set === false, 'not set up at first', JSON.stringify(c.mail));
  ok(!(await adm('setmail', { user: 'info@site.example', pass: '', host: '127.0.0.1', port: sport })).ok, 'password required');
  ok((await adm('setmail', { user: 'info@site.example', pass: 'wrong', host: '127.0.0.1', port: sport })).ok, 'settings saved');
  let t = await adm('testmail', { to: 'kev@dest.example' }); ok(!t.ok && /password was not accepted/.test(t.error || ''), 'wrong password is reported clearly', JSON.stringify(t));
  ok((await adm('setmail', { user: 'info@site.example', pass: 'mailbox-secret', host: '127.0.0.1', port: sport })).ok, 'right password saved');
  c = await adm('check'); ok(c.mail.set && c.mail.user === 'info@site.example' && !JSON.stringify(c).includes('mailbox-secret'), 'password never sent back');
  t = await adm('testmail', { to: 'kev@dest.example' }); ok(t.ok && mails.length === 1 && mails[0].rcpt[0].includes('kev@dest.example') && mails[0].from.includes('info@site.example'), 'test email sent through the mailbox', JSON.stringify(t));
  ok(/From: SME Constellation <info@site.example>/.test(mails[0].data) && /Subject: =\?UTF-8\?B\?/.test(mails[0].data), 'headers are right');
  ok((await adm('setmail', { user: 'info@site.example', pass: '', host: '127.0.0.1', port: sport })).ok, 'empty password keeps the saved one');
  // a real "forgot password"
  const r = await api('register', { email: 'pat@x.example', password: 'password-pat' });
  ok(r.ok && (await api('reset_request', { email: 'pat@x.example' })).ok && mails.length === 2, 'forgot password sends an email');
  const body = Buffer.from(mails[1].data.split('\r\n\r\n')[1].replace(/\s/g, ''), 'base64').toString();
  const m = body.match(/\?reset=(\w+)&u=(\w+)/); ok(!!m, 'email has the reset link', body.slice(0, 200));
  ok((await api('reset_request', { email: 'nobody@x.example' })).ok && mails.length === 2, 'unknown address: same answer, no email');
  ok(!readFileSync(join(data, 'settings.json'), 'utf8').includes('pat@'), 'settings hold no attendee data');
  ok((await adm('setmail', { user: '' })).ok && (await adm('check')).mail.set === false, 'can be removed');
} finally { php.kill(); smtp.close(); }
console.log(`${pass} passed, ${failN} failed`); process.exit(failN ? 1 : 0);
