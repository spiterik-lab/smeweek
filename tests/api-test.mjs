// End-to-end test of the Version 2 API against a local PHP server.  Run: node tests/api-test.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';

const root = new URL('..', import.meta.url).pathname;
const data = join(mkdtempSync(join(tmpdir(), 'smec-')), 'data');
mkdirSync(data); mkdirSync(data + '-v1');
// A Version 1 profile that must survive the upgrade (phone token "legacytoken").
const v1 = { v: 3, people: { aaaaaaaaaaaa: { name: 'Legacy Lou', company: 'Old Co', sector: 'Tech & IT', interests: ['training:get', 'network'], role: 'CEO',
  token_hash: crypto.createHash('sha256').update('legacytoken').digest('hex'), at: 1, created: 1, mobile: '99123456', email: 'lou@old.example', consent_at: 1, consent_v: '2026-10-21' } } };
writeFileSync(data + '-v1/people.json', JSON.stringify(v1));
const v1Before = readFileSync(data + '-v1/people.json', 'utf8');

// Mock push service: records what the server sends.
const pushes = [];
const mock = http.createServer((req, res) => { const ch = []; req.on('data', c => ch.push(c)); req.on('end', () => { pushes.push({ url: req.url, headers: req.headers, body: Buffer.concat(ch) }); res.writeHead(201); res.end(); }); });
await new Promise(r => mock.listen(0, '127.0.0.1', r));
const pushBase = `http://127.0.0.1:${mock.address().port}/`;

const port = 8700 + Math.floor(Math.random() * 200);
const php = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', root], { env: { ...process.env, SMEWEEK_DATA_DIR: data, SMEWEEK_PUSH_TEST: pushBase, SMEWEEK_MAIL_LOG: '1', SMEWEEK_ADMIN_HASH: crypto.createHash('sha256').update('test-organiser').digest('hex') }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 700));
const api = async (action, body, q = '') => { const r = await fetch(`http://127.0.0.1:${port}/api.php?action=${action}${q}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}); return r.json(); };
let pass = 0, failN = 0;
const ok = (c, name, extra = '') => { if (c) { pass++; } else { failN++; console.log('FAIL', name, extra); } };

try {
  const cfg = await api('config');
  ok(cfg.ok && cfg.version === '2.0' && cfg.sectors.length > 18 && cfg.vapid.length > 80, 'config', JSON.stringify(cfg).slice(0, 200));
  ok(cfg.agenda.some(a => a.who.includes('Danny McCoy')) && !JSON.stringify(cfg.agenda).includes('McKoy'), 'agenda typo fixed');
  ok(cfg.agenda.some(a => a.title.startsWith('Agentic Leaders. Human Futures. Navigating the risks')), 'Bondin title');

  // migration
  let list = await api('list');
  ok(list.people.length === 1 && list.people[0].sector === 'Tech, software & IT', 'v1 profile migrated with sector alias', JSON.stringify(list.people));
  ok(readFileSync(data + '-v1/people.json', 'utf8') === v1Before, 'v1 file untouched after migration');

  // legacy claim
  const legacy = await api('claim', { id: 'aaaaaaaaaaaa', token: 'legacytoken' });
  ok(legacy.ok && legacy.account.hasPassword === false, 'legacy claim', JSON.stringify(legacy));
  ok(!(await api('claim', { id: 'aaaaaaaaaaaa', token: 'wrong' })).ok, 'legacy claim rejects wrong token');
  const L = { id: legacy.id, token: legacy.token };
  const sec = await api('secure', { ...L, email: 'lou@old.example', password: 'longpassword' });
  ok(sec.ok && sec.account.hasPassword, 'legacy secures account');

  // register / login
  ok(!(await api('register', { email: 'bad', password: 'longpassword' })).ok, 'bad email rejected');
  ok(!(await api('register', { email: 'a@x.example', password: 'short' })).ok, 'short password rejected');
  const ra = await api('register', { email: 'Anna@x.example', password: 'password-anna' });
  ok(ra.ok && ra.isNew, 'register');
  ok(!(await api('register', { email: 'anna@x.example', password: 'password-anna' })).ok, 'duplicate email rejected');
  ok(!(await api('login', { email: 'anna@x.example', password: 'nope' })).ok, 'wrong password');
  const la = await api('login', { email: 'anna@x.example', password: 'password-anna' });
  ok(la.ok && la.isNew === true, 'login before profile => isNew');
  const A = { id: la.id, token: la.token };
  ok(!(await api('sync', { id: A.id, token: 'x' })).ok, 'sync needs a valid session');
  let s = await api('sync', A);
  ok(s.ok && s.profile === null && s.game.xp === 0, 'sync without profile');

  const profA = { name: 'Anna Borg', company: 'Harbour Hotels', role: 'Owner', sector: 'Tourism & hospitality', orgtype: 'small', stage: 'new',
    topics: ['service', 'marketing'], meet: ['funders', 'trainers'], interests: ['support:get', 'training:get', 'network'], mobile: '9911 2233', email: 'anna@x.example', work: 'Bookings', consent: true };
  ok(!(await api('profile', { ...A, ...profA, consent: false })).ok, 'profile needs consent');
  ok((await api('profile', { ...A, ...profA })).state === 'created', 'profile created');
  const rb = await api('register', { email: 'ben@y.example', password: 'password-ben' }); const B = { id: rb.id, token: rb.token };
  await api('profile', { ...B, name: 'Ben Vella', company: 'Fund Agency', sector: 'Business support & funding agencies', orgtype: 'agency', stage: 'guide',
    interests: ['support:give', 'training:give'], speaker: true, linkedin: 'linkedin.com/in/ben', email: 'ben@y.example', consent: true });
  list = await api('list');
  ok(list.people.length === 3 && !JSON.stringify(list).includes('9911') && !JSON.stringify(list).includes('@'), 'list is public-only');

  // push subscription for Ben (keys generated here so we can decrypt what the server sends)
  const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys(); const authSecret = crypto.randomBytes(16);
  const b64u = b => Buffer.from(b).toString('base64url');
  ok((await api('push_sub', { ...B, sub: { endpoint: pushBase + 'ben', keys: { p256dh: b64u(ecdh.getPublicKey()), auth: b64u(authSecret) } } })).ok, 'push subscribe');
  ok(!(await api('push_sub', { ...B, sub: { endpoint: 'https://evil.example/x', keys: { p256dh: 'a', auth: 'b' } } })).ok, 'push endpoint allow-list');

  // meet request -> push to Ben
  let c = await api('connect', { ...A, other: B.id, msg: 'Coffee?', share: { mobile: true, email: false, linkedin: true } });
  ok(c.state === 'requested', 'request sent');
  await new Promise(r => setTimeout(r, 600));
  ok(pushes.length === 1, 'push delivered to mock service', String(pushes.length));
  if (pushes.length) {
    const p = pushes[0], body = p.body;
    ok(p.headers['content-encoding'] === 'aes128gcm' && /^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]+$/.test(p.headers.authorization), 'push headers');
    // RFC 8291 decrypt
    const salt = body.subarray(0, 16), idlen = body[20], asPub = body.subarray(21, 21 + idlen), ct = body.subarray(21 + idlen);
    const shared = ecdh.computeSecret(asPub);
    const ikm = Buffer.from(crypto.hkdfSync('sha256', shared, authSecret, Buffer.concat([Buffer.from('WebPush: info\0'), ecdh.getPublicKey(), asPub]), 32));
    const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
    const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
    const dec = crypto.createDecipheriv('aes-128-gcm', cek, nonce); dec.setAuthTag(ct.subarray(ct.length - 16));
    let plain = ''; try { plain = Buffer.concat([dec.update(ct.subarray(0, ct.length - 16)), dec.final()]).toString(); } catch (e) { plain = 'DECRYPT FAILED ' + e.message; }
    ok(plain.endsWith('\x02') && JSON.parse(plain.slice(0, -1)).title === 'Anna Borg would like to meet you', 'push payload decrypts (RFC 8291)', plain);
    // VAPID JWT signature
    const [h, pl, sig] = p.headers.authorization.match(/t=([\w.-]+),/)[1].split('.');
    const k = Buffer.from(cfg.vapid, 'base64url');
    const pub = crypto.createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: b64u(k.subarray(1, 33)), y: b64u(k.subarray(33)) }, format: 'jwk' });
    ok(crypto.verify('sha256', Buffer.from(`${h}.${pl}`), { key: pub, dsaEncoding: 'ieee-p1363' }, Buffer.from(sig, 'base64url')), 'VAPID JWT signature verifies');
  }
  s = await api('sync', B);
  ok(s.incoming.length === 1 && s.incoming[0].msg === 'Coffee?' && s.unread === 1 && s.notifs[0].type === 'request', 'Ben sees the request', JSON.stringify(s.incoming));
  ok(!(await api('msg_send', { ...A, other: B.id, text: 'hi' })).ok, 'no messaging before a match');
  c = await api('connect', { ...B, other: A.id, share: { mobile: true, email: true, linkedin: true } });
  ok(c.state === 'matched', 'accept => matched');
  s = await api('sync', A);
  ok(s.matches.length === 1 && s.matches[0].card.linkedin && s.matches[0].card.email === 'ben@y.example' && s.notifs[0].type === 'match', 'Anna sees the match and Ben\'s card', JSON.stringify(s.matches));
  s = await api('sync', B);
  ok(s.matches[0].card.mobile === '9911 2233' && !s.matches[0].card.email, 'Ben sees only what Anna chose to share', JSON.stringify(s.matches[0].card));
  ok((await api('share', { ...A, other: B.id, share: { mobile: false, email: true, linkedin: false } })).ok, 'change sharing');
  s = await api('sync', B);
  ok(!s.matches[0].card.mobile && s.matches[0].card.email === 'anna@x.example', 'sharing change applied');

  // messages
  ok((await api('msg_send', { ...A, other: B.id, text: 'See you at <b>coffee</b>' })).ok, 'message sent');
  ok((await api('msg_send', { ...B, other: A.id, ask: 'mobile' })).ok, 'ask for a detail');
  s = await api('sync', A);
  ok(s.matches[0].unread === 1 && s.matches[0].last.t.includes('mobile number'), 'unread count', JSON.stringify(s.matches[0]));
  let m = await api('msgs', { ...A, other: B.id });
  ok(m.items.length === 2 && m.items[0].mine && m.items[0].t === 'See you at coffee' && m.items[1].ask === 'mobile', 'thread, tags stripped', JSON.stringify(m.items));
  ok((await api('sync', A)).matches[0].unread === 0, 'read after opening');
  ok(!(await api('msgs', { ...L, other: B.id })).ok, 'outsider cannot read a thread');

  // game
  await api('flag', { ...A, key: 'intro' }); await api('flag', { ...A, key: 'brief' });
  ok((await api('ask', { ...A, session: 'p1', text: 'How do we start with AI?', device: 'dev1' })).ok, 'question');
  s = await api('sync', A);
  const done = s.game.missions.filter(x => x.done).map(x => x.key).sort().join(',');
  ok(done === 'basics,brief,card,cross,focus,intro,match1,message,org,question,request,speaker,work', 'missions', done);
  ok(s.game.xp === 440 && s.game.levelName === 'Navigator' && s.game.strength === 100, 'xp/level/strength', JSON.stringify([s.game.xp, s.game.levelName, s.game.strength]));
  const lb = await api('leaderboard', A);
  ok(lb.top[0].name === 'Anna Borg' && lb.rank === 1, 'leaderboard', JSON.stringify(lb));

  // password reset
  await api('reset_request', { email: 'anna@x.example' });
  const mail = readFileSync(data + '/outbox.log', 'utf8'); const mm = mail.match(/\?reset=(\w+)&u=(\w+)/);
  ok(!!mm, 'reset email written');
  ok(!(await api('reset', { u: mm[2], reset: 'wrong', password: 'newpassword1' })).ok, 'bad reset token');
  const rs = await api('reset', { u: mm[2], reset: mm[1], password: 'newpassword1' });
  ok(rs.ok && rs.id === A.id, 'reset works');
  ok(!(await api('sync', A)).ok, 'old sessions ended after reset');
  ok((await api('login', { email: 'anna@x.example', password: 'newpassword1' })).ok, 'login with new password');
  ok(!(await api('reset', { u: mm[2], reset: mm[1], password: 'newpassword2' })).ok, 'reset link single-use');

  // organiser: report + rollback export
  const key = 'test-organiser';
  if (key) {
    const rep = await api('admin', { key, op: 'report' });
    ok(rep.ok && rep.stats['Matches made (both agreed)'] === 1 && rep.stats['Meet requests sent'] === 1, 'report', JSON.stringify(rep.stats));
    const rbk = await api('admin', { key, op: 'rollback_export' });
    const back = JSON.parse(readFileSync(data + '-v1/people.json', 'utf8'));
    ok(rbk.ok && Object.keys(back.people).length === 3 && !('orgtype' in back.people[B.id]), 'rollback export in v1 format', JSON.stringify(rbk));
  }

  // delete account
  const A2 = await api('login', { email: 'anna@x.example', password: 'newpassword1' });
  ok((await api('remove', { id: A2.id, token: A2.token })).ok, 'delete account');
  s = await api('sync', B);
  ok(s.matches.length === 0 && s.notifs.length === 0, 'everything about Anna is gone for Ben', JSON.stringify([s.matches, s.notifs]));
  ok(!(await api('login', { email: 'anna@x.example', password: 'newpassword1' })).ok, 'deleted account cannot sign in');
  ok(existsSync(data + '/.v2'), 'migration marker');
} catch (e) { failN++; console.log('ERROR', e); }
console.log(`${pass} passed, ${failN} failed`);
php.kill(); mock.close(); process.exit(failN ? 1 : 0);
