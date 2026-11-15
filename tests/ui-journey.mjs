// Walks the main attendee journeys in a real browser at phone size, against a throwaway copy of the server.
//   node tests/ui-journey.mjs [folder for screenshots]
// Covers: opening story, create account, profile steps, matches, ask to meet, accept, "It's a match",
// messages, asking for a contact detail, people map, agenda and brief, questions, the Me tab, sign out and sign in,
// password reset, and the install files (manifest and service worker).
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shots = process.argv[2] || path.join(tmpdir(), 'smec-shots'); mkdirSync(shots, { recursive: true });
const data = mkdtempSync(path.join(tmpdir(), 'smec-ui-'));
const port = 8200 + Math.floor(Math.random() * 500), base = `http://127.0.0.1:${port}/`;
const php = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', root], { env: { ...process.env, SMEWEEK_DATA_DIR: data, SMEWEEK_MAIL_LOG: '1', SMEWEEK_ADMIN_HASH: createHash('sha256').update('test-organiser').digest('hex') }, stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0; const errors = [];
const ok = (c, name) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + name); };
async function api(action, body) {
  const r = await fetch(base + 'api.php?action=' + action, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  return r.json();
}
async function seed(name, company, role, sector, interests, extra = {}) {
  const email = name.toLowerCase().replace(/\W/g, '') + '@example.test';
  const a = await api('register', { email, password: 'password-123' });
  await api('profile', { id: a.id, token: a.token, consent: true, name, company, role, sector, interests, mobile: '9900 0000', email, ...extra });
  return { id: a.id, token: a.token, name };
}

try {
  for (let i = 0; i < 40; i++) { try { await fetch(base + 'api.php?action=config'); break; } catch { await sleep(150); } }
  const funder = await seed('Rachel Borg', 'Malta Growth Agency', 'Funding Manager', 'Business support & funding agencies', ['support:give', 'knowhow:give', 'network'], { orgtype: 'agency', stage: 'guide', speaker: true });
  const trainer = await seed('Mark Vella', 'Northshore Academy', 'Director', 'Education, training & research', ['training:give', 'talent:give'], { orgtype: 'small', stage: 'use', topics: ['hr'] });
  const tech = await seed('Elena Grech', 'Cloudbay Systems', 'Solutions Architect', 'Tech, software & IT', ['solution:give', 'pilot:give', 'practice:give'], { orgtype: 'small', stage: 'core', topics: ['finance', 'admin'] });
  const peer = await seed('Paul Zammit', 'Bright Ledger', 'Partner', 'Accountancy, audit & tax', ['training:get', 'solution:get', 'network'], { orgtype: 'small', stage: 'explore', topics: ['finance'], meet: ['peers'] });
  await seed('Sarah Attard', 'Corner Deli Group', 'Owner', 'Retail & trade', ['knowhow:get', 'practice:get'], { orgtype: 'micro', stage: 'new' });
  await seed('Daniel Farrugia', 'Salina Fintech', 'CTO', 'Financial services & banking', ['practice:give', 'knowhow:give'], { orgtype: 'medium', stage: 'core', topics: ['finance', 'data'] });
  await seed('Claire Micallef', 'Data Rules Office', 'Senior Officer', 'Government & regulators', ['rules:give'], { orgtype: 'public', stage: 'guide' });

  await seed('Ian Pace', 'Skyline Aero', 'Founder', 'Other', ['collab:get', 'clients:get', 'contacts:get', 'collab:give'], { sector_other: 'Aviation', orgtype: 'edu' });
  const ian = (await api('list')).people.find(p => p.name === 'Ian Pace');
  ok(ian.sector === 'Other' && ian.sector_other === 'Aviation', 'a sector typed under "Other" is saved');
  ok(ian.interests.join() === 'collab:get,clients:get,contacts:get' && ian.orgtype === '', 'Collaborators, Clients and Contacts are "looking for" only; the old education organisation type is gone');
  const cfg = await api('config');
  ok(cfg.sectors.some(x => x[0] === 'Education, training & research') && !cfg.sectors.some(x => x[0] === 'Research & innovation'), 'one Education, training & research sector');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|net::ERR|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  const shot = async n => { await sleep(700); await page.screenshot({ path: path.join(shots, n + '.png') }); };
  const tap = async (sel, o) => page.locator(sel).first().click(o);
  const btn = name => page.getByRole('button', { name, exact: true }).first();

  // ---- opening story ----
  await page.goto(base); await page.waitForSelector('#story .scene.on');
  ok(await page.locator('#story .big').first().isVisible(), 'opening story shows');
  await shot('01-story-spark');
  const hb = await page.locator('.hold-btn').boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await page.mouse.down(); await sleep(1200); await page.mouse.up();
  await page.waitForFunction(() => document.querySelectorAll('#story .scene')[1].classList.contains('on'), null, { timeout: 4000 });
  ok(await page.locator('.xp-hud b').first().textContent() === '20', 'press and hold lights the star and gives 20 XP');
  await shot('02-story-stat');
  for (const n of ['03-story-gap', '04-story-question', '05-story-room', '06-story-cta']) { await btn('Continue').click(); await shot(n); }
  await btn('Get started').click(); await page.waitForSelector('#auth');
  await shot('07-create-account');

  // ---- create account ----
  await page.fill('#auth input[type=email]', 'kevin@example.test'); await page.fill('#auth input[type=password]', 'short');
  await btn('Create my account').click(); await page.waitForSelector('#auth .note.warn');
  ok(/8 characters/.test(await page.locator('#auth .note.warn').textContent()), 'weak password is refused with a clear message');
  await page.fill('#auth input[type=password]', 'forum-2026-pass');
  await btn('Create my account').click(); await page.waitForSelector('#wizard');
  ok(true, 'account created, taken straight to the profile steps');

  // ---- profile steps ----
  await btn('Continue').click();
  ok(/name and organisation/.test(await page.locator('#wizard .note.warn').textContent()), 'step 1 asks for name and organisation');
  const inputs = page.locator('#wizard .wz-step input[type=text]');
  await inputs.nth(0).fill('Kevin Spiteri'); await inputs.nth(1).fill('Harbour Books Ltd'); await inputs.nth(2).fill('Managing Director');
  await shot('08-profile-1-basics'); await btn('Continue').click();
  await page.selectOption('#wizard select', 'Other');
  ok(await page.locator('#secOther input').isVisible(), 'choosing Other shows a box to type your own sector');
  await page.selectOption('#wizard select', 'Accountancy, audit & tax');
  ok(!(await page.locator('#secOther').isVisible()), 'the box hides again for a listed sector'); await btn('Small business (10 to 49)').click(); await btn('Exploring and experimenting').click();
  await shot('09-profile-2-organisation'); await btn('Continue').click();
  await btn('Continue').click();
  ok(/at least one/.test(await page.locator('#wizard .note.warn').textContent()), 'step 3 needs at least one offer or need');
  for (const n of ['Our own experience of using AI', 'AI training for my team', 'An AI product or service for my business', 'Collaborators', 'Clients', 'Contacts', 'Networking with others in the room']) await btn(n).click();
  await page.locator('#wizard .chip', { hasText: 'Funding, grants or schemes for AI' }).nth(1).click();
  await shot('10-profile-3-offer-need'); await btn('Continue').click();
  for (const n of ['Finance and accounting', 'Admin and paperwork', 'Funders and support agencies', 'AI and tech providers', 'People in my sector']) await btn(n).click();
  await page.locator('#wizard .wz-step input[type=text]').fill('Automating our quotes and invoices');
  await shot('11-profile-4-sharpen'); await btn('Continue').click();
  await page.locator('#wizard input[type=tel]').fill('9912 3456');
  ok(await page.locator('#wizard input[type=email]').inputValue() === 'kevin@example.test', 'contact card email is pre-filled from the account');
  await btn('Put me on the map').click();
  ok(/Tick the first box/.test(await page.locator('#wizard .note.warn').textContent()), 'consent is required before the profile is shown');
  await page.locator('#wizard .check input').first().check();
  await shot('12-profile-5-card'); await btn('Put me on the map').click();
  await page.waitForSelector('.reveal'); await shot('13-on-the-map');
  ok(/people in the room already match/.test(await page.locator('.reveal').textContent()), 'reveal shows how many people already match');
  await btn('See my matches').click(); await page.waitForSelector('#app .mcard');

  // ---- matches ----
  await shot('14-home-matches');
  const firstName = await page.locator('.mcard .name').first().textContent();
  ok(await page.locator('.mcard').count() >= 5, 'home shows ranked match cards (' + firstName + ' first)');
  ok(await page.locator('.mcard .why li').count() >= 5, 'each match explains why');
  ok(/XP/.test(await page.locator('#xpPill').textContent()), 'XP and level show in the top bar');
  await page.locator('.mcard').first().getByRole('button', { name: 'Ask to meet' }).click();
  await page.waitForSelector('.sheet textarea'); await shot('15-ask-to-meet');
  await btn('Send request').click(); await page.waitForSelector('.sheet', { state: 'detached' });
  await page.waitForFunction(() => /Request sent/.test(document.querySelector('.mcard')?.textContent || ''));
  ok(true, 'meet request sent, card shows "Request sent"');

  // someone asks to meet me -> I accept -> match
  const meId = await page.evaluate(() => JSON.parse(localStorage.getItem('smec-me')).id);
  const asker = [tech, funder, trainer].find(p => p.name !== firstName);
  await api('connect', { id: asker.id, token: asker.token, other: meId, msg: 'We build invoice automation. Coffee at the break?' });
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForSelector('.req blockquote', { timeout: 15000 }); await shot('16-incoming-request');
  ok(await page.locator('#bell .pip').isVisible(), 'bell shows the new request');
  await page.locator('.req').getByRole('button', { name: 'Accept and match' }).click(); await page.waitForSelector('.sharegrid'); await shot('17-accept-share-choice');
  await page.locator('.sheet').getByRole('button', { name: 'Accept and match' }).click();
  await page.waitForSelector('.celebrate'); await shot('18-its-a-match');
  ok(/match/.test(await page.locator('.celebrate .big').textContent()), '"It\'s a match" celebration appears');
  await btn('Say hello').click(); await page.waitForSelector('.sheet.full .chatbar');
  ok(await page.locator('.cardbox a[href^="tel:"]').count() === 1, 'the match\'s shared contact details are shown');
  await page.fill('.chatbar textarea', 'Hello, yes. See you at 10:35 by the coffee.'); await tap('.chatbar .iconbtn');
  await page.waitForSelector('.bub.mine');
  await api('msg_send', { id: asker.id, token: asker.token, other: meId, text: 'Perfect, see you there.' });
  await api('msg_send', { id: asker.id, token: asker.token, other: meId, ask: 'email' });
  await page.waitForFunction(() => document.querySelectorAll('.bub').length >= 3, null, { timeout: 12000 });
  await shot('19-chat');
  ok(await page.locator('.bub').count() >= 3, 'messages arrive in the chat both ways');
  await page.locator('.sheet .close').click(); await page.waitForSelector('.sheet', { state: 'detached' });

  // the person I asked accepts while I'm in the app
  const asked = [funder, trainer, tech, peer].find(p => p.name === firstName);
  if (asked) {
    await api('connect', { id: asked.id, token: asked.token, other: meId, msg: '' });
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.waitForSelector('.celebrate', { timeout: 15000 });
    ok(true, 'celebration also appears when the other person accepts');
    await btn('Later').click(); await page.waitForSelector('.celebrate', { state: 'detached' });
  }
  await sleep(4500); await shot('20-home-with-matches');
  ok(await page.locator('.list .prow').count() >= 1, 'matches are listed on home');

  // ---- people ----
  await tap('.dock [data-tab=people]'); await page.waitForSelector('#plist .prow'); await sleep(1500); await shot('21-people-map');
  ok(await page.locator('#plist .prow').count() === 8, 'people tab lists everyone else in the room');
  await btn('Offers what I need').click(); await sleep(300);
  ok(await page.locator('#plist .prow').count() < 8, 'filters narrow the list');
  await page.locator('#plist .prow').last().click(); await page.waitForSelector('.sheet .phead'); await shot('22-person');
  await page.locator('.sheet .close').click(); await page.waitForSelector('.sheet', { state: 'detached' });

  // ---- agenda and brief ----
  await tap('.dock [data-tab=agenda]'); await page.waitForSelector('.ag'); await shot('23-agenda');
  const ag = await page.locator('#view').textContent();
  ok(/Danny McCoy/.test(ag) && !/McKoy/.test(ag), 'agenda shows Danny McCoy spelt correctly');
  ok(/Agentic Leaders\. Human Futures\./.test(ag), 'agenda shows the full title of Joanne Bondin\'s talk');
  await tap('.brief-card'); await page.waitForSelector('.reader h2'); await shot('24-brief');
  await page.locator('.sheet .close').click(); await page.waitForSelector('.sheet', { state: 'detached' });

  // ---- live ----
  await tap('.dock [data-tab=live]'); await page.waitForSelector('#qlist');
  await page.fill('#view textarea', 'What is the first AI task a ten-person firm should automate?'); await btn('Send my question').click();
  await page.waitForSelector('#qlist .q'); await shot('25-live');
  ok(await page.locator('#qlist .q').count() === 1, 'a question from the floor is sent and listed');

  // ---- live poll ----
  await api('padmin', { key: 'test-organiser', op: 'open', pid: 'journey' });
  await page.waitForSelector('#pollBox .opt-card', { timeout: 15000 });
  await page.locator('#pollBox .opt-card').nth(1).click(); await page.locator('#pollBox').getByRole('button', { name: 'Vote' }).click();
  await page.waitForSelector('#pollBox .pbar'); await page.evaluate(() => scrollTo(0, 0)); await shot('25b-poll');
  ok(/1 vote/.test(await page.locator('#pollBox').textContent()), 'a live poll opens on the phone, takes a vote and shows results');
  await api('padmin', { key: 'test-organiser', op: 'close' });

  // ---- me ----
  await tap('.dock [data-tab=me]'); await page.waitForSelector('.mlist'); await sleep(900); await shot('26-me');
  const done = await page.locator('.mrow.done').count();
  ok(done >= 10 && await page.locator('.mrow.done', { hasText: 'Vote in a live poll' }).count() === 1, 'missions are ticked off as you go (' + done + ' done)');
  ok(await page.locator('#board .lb').count() >= 1, 'leaderboard shows');
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight)); await shot('27-me-settings');

  // ---- install files ----
  const man = await (await fetch(base + 'manifest.webmanifest')).json();
  ok(man.display === 'standalone' && man.icons.length === 3 && man.icons.every(i => existsSync(path.join(root, i.src))), 'web app manifest is valid and its icons exist');
  const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!(r && (r.active || r.installing || r.waiting)); });
  ok(sw, 'service worker registers (needed for install and push)');

  // ---- sign out, sign back in ----
  await page.getByRole('button', { name: /Sign out/ }).click(); await page.waitForSelector('#auth');
  await page.fill('#auth input[type=email]', 'kevin@example.test'); await page.fill('#auth input[type=password]', 'wrong-password');
  await page.locator('#auth form button[type=submit]').click(); await page.waitForSelector('#auth .note.warn');
  ok(/Wrong email or password/.test(await page.locator('#auth .note.warn').textContent()), 'wrong password is refused');
  await page.fill('#auth input[type=password]', 'forum-2026-pass'); await page.locator('#auth form button[type=submit]').click();
  await page.waitForSelector('#app .hello');
  ok(true, 'sign in goes straight to the app, no profile steps the second time');

  // ---- password reset ----
  await api('reset_request', { email: 'kevin@example.test' });
  const link = /\?reset=\w+&u=\w+/.exec(readFileSync(path.join(data, 'outbox.log'), 'utf8'))[0];
  const p2 = await ctx.newPage(); await p2.goto(base + link); await p2.waitForSelector('#auth input[type=password]');
  await p2.fill('#auth input[type=password]', 'brand-new-pass-1'); await p2.locator('#auth form button[type=submit]').click();
  await p2.waitForSelector('#app .hello');
  ok(true, 'password reset link lets you choose a new password and signs you in');
  await p2.close();

  // ---- desktop width ----
  const d = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const dp = await d.newPage();
  await dp.goto(base); await dp.evaluate(() => localStorage.setItem('smec-intro', '{"seen":true}')); await dp.goto(base); await dp.waitForSelector('#auth');
  await dp.getByRole('tab', { name: 'Sign in' }).click(); await dp.fill('#auth input[type=email]', 'kevin@example.test'); await dp.fill('#auth input[type=password]', 'brand-new-pass-1');
  await dp.locator('#auth form button[type=submit]').click(); await dp.waitForSelector('#app .hello'); await sleep(800); await dp.screenshot({ path: path.join(shots, '30-desktop-home.png') });
  await dp.locator('.dock [data-tab=people]').click(); await sleep(1800); await dp.screenshot({ path: path.join(shots, '31-desktop-people.png') });
  ok(true, 'works at desktop width');

  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
} catch (e) { fail++; console.log('FAIL (stopped) ' + e.message.split('\n')[0]); console.log(e.stack.split('\n').slice(0, 6).join('\n')); console.log(errors.join('\n')); }
finally { php.kill(); }
console.log(`\n${pass} passed, ${fail} failed. Screenshots: ${shots}`);
process.exit(fail ? 1 : 0);
