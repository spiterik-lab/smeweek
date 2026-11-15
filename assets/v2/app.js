/* SME Constellation 2.0 – the attendee app: start-up, the five tabs, people, requests, matches, chat,
   notifications, installing, and the game layer. Event content comes from event.php through api.php. */
(function (V) {
"use strict";
const {h, $, I, api, store, device, toast, sheet, closeSheets, Stars, Sky, initials, first, ago, clock, b64ToU8, download, buzz} = V;
const {story, auth, wizard, reveal, busy, field, pwField, chip, show, span} = V.flow;
const S = V.S, M = window.SMEMatch;
const AI_LABEL = "Suggested by AI (Claude). Use it as a starting point.";
const DETAIL = {mobile: "mobile number", email: "email address", linkedin: "LinkedIn or website"};

// Fictional example people: only shown when switched on, never saved, cannot be contacted.
// [name, organisation, role, sector, interests, kind of organisation, AI stage, focus areas, speaker]
const EX = [
  ["Maria", "Harbour Light Hotels", "Operations Manager", "Tourism & hospitality", ["training:get", "solution:get", "network"], "medium", "explore", ["service", "ops"]],
  ["Luke", "Bluegate Logistics", "CEO", "Maritime, shipping & logistics", ["solution:get", "practice:get", "pilot:get"], "small", "new", ["ops", "data"]],
  ["Rebecca", "Pixelforge Studios", "Head of Product", "Gaming & digital", ["solution:give", "practice:give", "network"], "small", "core", ["software", "data"]],
  ["Daniel", "Salina Fintech", "CTO", "Financial services & banking", ["practice:give", "knowhow:give", "talent:get"], "medium", "core", ["finance", "security"]],
  ["Claire", "Seabreeze Aquaculture", "Founder", "Food, agriculture & fisheries", ["support:get", "knowhow:get"], "micro", "new", ["ops", "admin"]],
  ["Mark", "Aerotech Components", "Plant Manager", "Robotics & engineering", ["training:get", "practice:get", "pilot:give"], "medium", "explore", ["making", "ops"]],
  ["Sarah", "Corner Deli Group", "Owner", "Retail & trade", ["knowhow:get", "solution:get", "network"], "micro", "new", ["marketing", "admin"]],
  ["Nathan", "Grid & Ledger Advisory", "Partner", "Accountancy, audit & tax", ["knowhow:give", "rules:give", "network"], "small", "use", ["finance", "rules"]],
  ["Elena", "Cloudbay Systems", "Solutions Architect", "Tech, software & IT", ["solution:give", "training:give", "pilot:give"], "small", "guide", ["software", "data"]],
  ["Joseph", "Skills Forward Agency", "Programme Lead", "Business support & funding agencies", ["support:give", "training:give"], "agency", "guide", ["strategy"], true],
  ["Anna", "Northshore Academy", "Director", "Education & training", ["training:give", "talent:give", "knowhow:get"], "edu", "use", ["hr", "strategy"]],
  ["Kurt", "Valley Print Works", "Managing Director", "Manufacturing", ["support:get", "solution:get"], "small", "explore", ["making", "marketing"]],
  ["Paul", "Bright Ledger Accountants", "Director", "Accountancy, audit & tax", ["training:get", "knowhow:get", "rules:get"], "small", "explore", ["finance", "admin"]],
  ["Julia", "Greenroof Energy", "Co-founder", "Energy, water & environment", ["support:get", "pilot:get", "network"], "micro", "explore", ["data", "ops"]],
  ["Matthew", "Secure Isle IT", "Security Lead", "Tech, software & IT", ["knowhow:give", "practice:give", "rules:give"], "small", "core", ["security", "rules"]],
  ["Chiara", "Care Plus Homes", "Operations Director", "Health & care", ["solution:get", "training:get"], "medium", "new", ["admin", "hr"]],
  ["Nicole", "Harbourline Insurance", "HR Manager", "Financial services & banking", ["training:get", "talent:get", "network"], "large", "use", ["hr", "service"]],
  ["Adrian", "Workers First Union", "Policy Officer", "Employer bodies, unions & associations", ["knowhow:get", "practice:get", "network"], "assoc", "explore", ["hr", "rules"]],
  ["Sophie", "Wordsmith Studio", "Founder", "Marketing, media & communications", ["solution:give", "practice:give", "network"], "solo", "use", ["marketing", "service"]],
  ["Karl", "Data Rules Office", "Senior Officer", "Government & regulators", ["rules:give", "knowhow:give"], "public", "guide", ["rules", "security"], true]
].map((r, i) => ({id: "ex" + i, name: r[0], company: r[1], role: r[2], sector: r[3], interests: r[4], orgtype: r[5], stage: r[6], topics: r[7], meet: [], speaker: !!r[8], work: "", example: true}));

// ---------- the server, signed in ----------
V.authed = async (action, body = {}) => {
  if (!S.me) throw new Error("Please sign in again.");
  try { return await api(action, Object.assign({id: S.me.id, token: S.me.token}, body)); }
  catch (e) { if (e.status === 401) signedOut(true); throw e; }
};
const authed = V.authed;
function signedOut(expired) {
  stopLoops(); closeSheets(); store.del("me"); store.del("seenM"); store.del("game"); store.del("seenN");
  S.me = null; S.sync = null; S.account = null; S.tab = "home"; S.showEx = false;
  auth({mode: "signin"}); if (expired) toast("Please sign in again.", {warn: true});
}
V.enter = async r => {
  S.me = {id: r.id, token: r.token}; S.oauthName = r.name || ""; store.set("me", S.me);
  await start();
};

// ---------- people and matching ----------
function recompute() {
  S.all = S.showEx ? S.people.concat(EX) : S.people;
  S.byId = new Map(S.all.map(p => [p.id, p]));
  S.meP = S.byId.get(S.me.id) || (S.sync && S.sync.profile ? Object.assign({id: S.me.id}, S.sync.profile) : null);
  S.ranked = S.meP ? M.rank(S.meP, S.all, S.cfg) : [];
  S.rankOf = new Map(S.ranked.map(r => [r.p.id, r]));
}
async function loadPeople(force) {
  const j = await api("list", null, "&since=" + (force ? -1 : S.peopleV));
  if (j.unchanged) return false;
  S.peopleV = j.v; S.people = j.people; recompute(); return true;
}
function skyLinks(list) {
  const out = [], n = list.length, sc = (a, b) => Math.max(M.score(a, b, S.cfg).s, M.score(b, a, S.cfg).s);
  if (n <= 90) { for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const s = sc(list[i], list[j]); if (s >= 3.5) out.push([i, j, s]); } }
  else { const i = list.findIndex(p => p.id === S.me.id); if (i >= 0) list.forEach((p, j) => { if (j !== i) { const s = sc(list[i], p); if (s >= 3.5) out.push([i, j, s]); } }); }
  return out;
}
const rel = id => !S.sync ? "none" : S.sync.matches.some(m => m.id === id) ? "match" : S.sync.incoming.some(m => m.id === id) ? "incoming" : S.sync.sent.includes(id) ? "sent" : "none";
const label = (list, key, short) => { const t = (list || []).find(x => x.key === key); return t ? (short ? t.short : t.label) : ""; };
function words(p, side) {
  const out = [];
  for (const id of p.interests || []) { const [k, s] = id.split(":"); if (s !== side) continue; const it = S.cfg.interests.find(x => x.key === k); if (it) out.push(side === "give" ? it.give : it.get); }
  return out;
}
const av = (p, size) => h("div", {class: "avatar" + (p.speaker ? " spk" : ""), style: {"--c": S.color[p.sector] || "#b0acd0", "--s": (size || 48) + "px"}, "aria-hidden": "true"}, initials(p.name));
const sub = p => [p.role, p.company].filter(Boolean).join(" · ");
function flags(p) { return [p.speaker ? h("span", "tag flag spk", "Speaker") : null, p.example ? h("span", "tag flag", "Example") : null]; }
function prow(p, right, onclick, line) {
  return h("button", {class: "prow", type: "button", onclick: onclick || (() => openPerson(p.id))}, av(p, 44),
    h("span", "t", h("b", null, p.name, " ", flags(p)), h("span", null, line || sub(p))), right || null);
}
function whyList(reasons, n) {
  const icon = {get: "check", give: "hand", meet: "star"};
  return h("ul", "why", reasons.slice(0, n).map(r => h("li", r.kind === "get" ? "get" : r.kind === "meet" ? "meet" : "", I(icon[r.kind] || "spark"), h("span", null, r.text))));
}
const fitline = r => h("div", "fitline", h("div", "bar", h("i", {style: {width: r.fit + "%"}})), h("b", null, r.fit + "% fit"));

// =====================================================================
// Start-up
// =====================================================================
const hideBoot = () => $("boot").classList.add("gone");
async function boot() {
  try { S.cfg = await api("config"); }
  catch (e) {
    hideBoot();
    return show(h("div", {class: "auth-wrap", style: {"justify-content": "center", "min-height": "100dvh"}}, h("h1", "h1", "We can't reach the app right now"), h("p", "dim", e.message),
      h("button", {class: "btn primary", type: "button", onclick: () => location.reload()}, "Try again")));
  }
  S.sectors = S.cfg.sectors.map(s => s[0]); S.color = Object.fromEntries(S.cfg.sectors);
  api("hello").catch(() => {});
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
    navigator.serviceWorker.addEventListener("message", e => { if (e.data && e.data.open) { setOpen(new URL(e.data.open, location.href).searchParams); if (S.sync) doSync().then(handleOpen); } });
  }
  const q = new URLSearchParams(location.search), hash = new URLSearchParams(location.hash.slice(1));
  setOpen(q);
  try {
    // Back from Google or Microsoft
    if (hash.get("id_token") || hash.get("error")) {
      const st = store.get("oauth"); store.del("oauth"); history.replaceState(null, "", location.pathname);
      if (hash.get("id_token") && st) { try { await V.enter(await api("oauth", {provider: st.provider, id_token: hash.get("id_token"), nonce: st.nonce})); return; } catch (e) { toast(e.message, {warn: true, ms: 7000}); } }
      else toast("That sign-in was cancelled.", {warn: true});
      return auth({mode: "signin"});
    }
    if (q.get("reset") && q.get("u")) return auth({reset: {t: q.get("reset"), u: q.get("u")}});
    const me = store.get("me");
    if (me && me.id && me.token) {
      try { await api("sync", {id: me.id, token: me.token}); S.me = {id: me.id, token: me.token}; return await start(); }
      catch (e) {
        if (e.status !== 401) throw e;
        // A phone that joined under Version 1 has a profile but no account yet.
        try { await api("claim", {id: me.id, token: me.token}); S.me = {id: me.id, token: me.token}; return await start(); } catch { store.del("me"); }
      }
    }
    if ((store.get("intro") || {}).seen) auth({mode: me ? "signin" : "create"}); else story(() => auth());
  } catch (e) {
    show(h("div", {class: "auth-wrap", style: {"justify-content": "center", "min-height": "100dvh"}}, h("h1", "h1", "Something went wrong"), h("p", "dim", e.message),
      h("button", {class: "btn primary", type: "button", onclick: () => location.reload()}, "Try again")));
  } finally { hideBoot(); }
}
function setOpen(q) { if (q.get("open")) S.open = {open: q.get("open"), with: q.get("with") || ""}; }

async function start() {
  await doSync(true); await loadPeople(true);
  const intro = store.get("intro") || {};
  if (intro.watched && !mission("intro").done) authed("flag", {key: "intro"}).then(() => doSync()).catch(() => {});
  if (!S.sync.profile) {
    return wizard({name: S.oauthName, onDone: async () => {
      await doSync(true); await loadPeople(true);
      const g = S.sync.game;
      reveal({name: S.sync.profile.name, color: S.color[S.sync.profile.sector] || "#e8a892", matches: S.ranked.filter(r => r.s >= 3).length, xp: g.xp, level: g.levelName, done: app});
      rememberGame();
    }});
  }
  app();
}
const mission = k => (S.sync.game.missions.find(m => m.key === k) || {done: true});

// ---------- keeping the phone up to date ----------
let loopGen = 0;
function stopLoops() { loopGen++; }
function startLoops() {
  const gen = ++loopGen;
  const loop = (fn, ms) => { const run = async () => { if (gen !== loopGen) return; try { await fn(); } catch {} if (gen === loopGen) setTimeout(run, document.hidden ? ms * 3 : ms); }; setTimeout(run, ms); };
  loop(doSync, 9000);
  loop(async () => { if (await loadPeople()) refresh(); }, 12000);
  if (S.cfg.polls) loop(loadPoll, 7000);
  loop(async () => { if (S.tab === "live") await loadQuestions(); }, 8000);
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && S.me && S.sync && $("app")) doSync().catch(() => {}); });

async function doSync(quiet) {
  const j = await authed("sync");
  S.sync = j; S.account = j.account;
  store.set("me", {id: S.me.id, token: S.me.token, profile: j.profile}); // "profile" keeps Version 1 happy after a rollback
  recompute();
  if (quiet !== true) afterSync(j);
  chrome(); refresh();
  return j;
}
function rememberGame() {
  const g = S.sync.game;
  store.set("game", {id: S.me.id, level: g.level, done: g.missions.filter(m => m.done).map(m => m.key)});
  store.set("seenM", {id: S.me.id, ids: S.sync.matches.map(m => m.id)});
  store.set("seenN", {id: S.me.id, ns: S.sync.notifs.map(n => n.n)});
}
function afterSync(j) {
  const g = j.game, old = store.get("game"), sm = store.get("seenM"), sn = store.get("seenN");
  if (old && old.id === S.me.id) {
    const fresh = g.missions.filter(m => m.done && !old.done.includes(m.key));
    fresh.slice(0, 3).forEach((m, i) => setTimeout(() => toast(m.label, {xp: m.xp}), i * 700));
    if (g.level > old.level) setTimeout(() => { toast("Level up: you're now a " + g.levelName, {icon: "trophy", ms: 5000}); buzz([30, 50, 30]); }, fresh.length * 700);
  }
  if (sm && sm.id === S.me.id) { const m = j.matches.find(x => !sm.ids.includes(x.id)); if (m) celebrate(m); }
  if (sn && sn.id === S.me.id) for (const n of j.notifs.filter(x => !x.read && !sn.ns.includes(x.n)).slice(0, 2)) {
    if (n.type === "request") toast(n.name + " would like to meet you", {icon: "hand", ms: 6000, onclick: () => { go("home"); }});
    if (n.type === "message" && S.chatWith !== n.from) toast("New message from " + n.name, {icon: "chat", ms: 6000, onclick: () => openMatch(n.from)});
  }
  rememberGame();
}

// =====================================================================
// The shell: top bar, five tabs, dock
// =====================================================================
const TABS = [["home", "Matches", "star"], ["people", "People", "users"], ["agenda", "Agenda", "calendar"], ["live", "Live", "live"], ["me", "Me", null]];
let view, sig = "";
function app() {
  stopLoops();
  view = h("main", {id: "view"});
  const dock = h("nav", {class: "dock", "aria-label": "Main"}, TABS.map(([k, name, icon]) =>
    h("button", {type: "button", "data-tab": k, onclick: () => go(k)}, icon ? I(icon) : h("span", "me-dot", initials((S.sync.profile || {}).name)), h("span", null, name), h("span", {class: "pip", hidden: true}))));
  show(h("div", {id: "app"},
    h("header", "topbar", h("div", "in",
      h("img", {src: "assets/img/brand-logos.png", alt: "Malta Employers · SME Week Malta 2026"}),
      h("button", {class: "xp-pill", type: "button", id: "xpPill", "aria-label": "Your level and missions", onclick: () => go("me")}, h("span", "ring", I("star")), h("span", null, h("b"), h("i", {style: {"font-style": "normal"}}))),
      h("button", {class: "iconbtn", type: "button", id: "bell", "aria-label": "Notifications", onclick: openNotifs}, I("bell"), h("span", {class: "pip", hidden: true})))),
    view, dock));
  chrome(); go(S.tab || "home"); startLoops(); loadPoll().catch(() => {});
  if (standalone() && !mission("install").done) authed("flag", {key: "install"}).then(() => doSync()).catch(() => {});
  pushState().then(async on => { if (on) { const sub = await currentSub(); if (sub) authed("push_sub", {sub: sub.toJSON()}).catch(() => {}); } });
  handleOpen();
}
function chrome() {
  if (!$("app") || !S.sync) return;
  const g = S.sync.game, pill = $("xpPill");
  pill.querySelector(".ring").style.setProperty("--p", g.next ? Math.round((g.xp - g.floor) / (g.next - g.floor) * 100) : 100);
  pill.querySelector("b").textContent = g.levelName.toUpperCase(); pill.querySelector("i").textContent = g.xp + " XP";
  const pip = (el, n, text) => { el.hidden = !n; el.textContent = text || (n > 9 ? "9+" : n || ""); };
  pip($("bell").querySelector(".pip"), S.sync.unread);
  const d = k => document.querySelector(`.dock [data-tab=${k}] .pip`);
  pip(d("home"), S.sync.incoming.length + S.sync.matches.reduce((a, m) => a + (m.unread || 0), 0));
  pip(d("live"), S.poll && S.poll.open && !(S.poll.mine || []).length ? 1 : 0, "!");
}
function go(tab) {
  S.tab = tab; sig = "";
  for (const b of document.querySelectorAll(".dock button")) b.setAttribute("aria-current", b.dataset.tab === tab ? "page" : "false");
  view.className = tab === "people" ? "wide" : "";
  render(); scrollTo(0, 0);
  if (tab === "live") loadQuestions().catch(() => {});
}
const RENDER = {home, people, agenda, live, me};
function render() { if (!view || !view.isConnected) return; RENDER[S.tab](); }
/** Re-draw the current tab only when what it shows has changed (so typing and scrolling are never interrupted). */
function refresh() {
  if (!view || !view.isConnected || !S.sync) return;
  if (S.tab === "live") return liveUpdate();
  const s = JSON.stringify([S.tab, S.peopleV, S.showEx, S.sync.incoming, S.sync.matches, S.sync.sent, S.sync.declined, S.sync.game, S.sync.account, S.sync.profile && S.sync.profile.at, S.pushOn, S.poll && S.poll.open]);
  if (s === sig) return;
  if (S.tab === "people" && sig) { sig = s; return peopleUpdate(); }
  const deck = view.querySelector(".deck"), x = deck ? deck.scrollLeft : 0, first = !sig;
  sig = s; render();
  if (!first) for (const e of view.children) e.style.animation = "none";
  const d2 = view.querySelector(".deck"); if (d2 && x) d2.scrollLeft = x;
}
function handleOpen() {
  const o = S.open; if (!o || !$("app")) return; S.open = null;
  if (location.search) history.replaceState(null, "", location.pathname);
  if (o.open === "requests") go("home");
  else if ((o.open === "match" || o.open === "chat") && o.with) { go("home"); rel(o.with) === "match" ? openMatch(o.with) : openPerson(o.with); }
}

// =====================================================================
// Tab 1: Matches (home)
// =====================================================================
const NEXT = ["basics", "org", "focus", "card", "install", "notify", "request", "work", "brief", "question", "message", "poll", "intro"];
function nextMission() {
  for (const k of NEXT) {
    const m = mission(k); if (m.done) continue;
    if (k === "message" && !S.sync.matches.length) continue;
    if (k === "poll" && !(S.poll && S.poll.open)) continue;
    if (k === "request" && !S.ranked.some(r => !r.p.example)) continue;
    return m;
  }
  return null;
}
function doMission(k) {
  const step = {basics: 0, org: 1, focus: 3, card: 4, work: 3}[k];
  if (step != null) return editProfile(step);
  if (k === "install") return install();
  if (k === "notify") return enablePush();
  if (k === "brief") return openBrief();
  if (k === "question" || k === "poll") return go("live");
  if (k === "intro") { stopLoops(); return story(() => { authed("flag", {key: "intro"}).catch(() => {}); app(); doSync().catch(() => {}); }); }
  if (k === "message" && S.sync.matches[0]) return openMatch(S.sync.matches[0].id);
  go(S.tab === "people" ? "home" : "people");
}
function missionBtn(m) {
  return h("button", {class: "mission", type: "button", onclick: () => doMission(m.key)}, I("star"),
    h("span", "grow", h("span", {class: "eyebrow", style: {color: "var(--gold)", display: "block", "margin-bottom": "3px"}}, "Next mission"), h("b", {style: {"font-size": "14.5px"}}, m.label)), h("span", "xp", "+" + m.xp + " XP"));
}
function home() {
  const s = S.sync, p = s.profile, g = s.game, kids = [];
  const hour = new Date().getHours();
  kids.push(h("div", "hello stack tight", h("p", "eyebrow", S.cfg.eventName), h("h1", "serif", span((hour < 12 ? "Good morning, " : hour < 18 ? "Good afternoon, " : "Good evening, ") + "<em></em>"))));
  kids[0].querySelector("em").textContent = first(p.name) + ".";
  if (!s.account.email && !s.account.google && !s.account.microsoft)
    kids.push(h("div", "banner", I("lock"), h("div", "grow", h("b", null, "Keep your profile safe"), h("p", "small dim", "Add an email and password so you can sign in on any device.")), h("button", {class: "btn small primary", type: "button", onclick: () => secure()}, "Add")));
  if (S.poll && S.poll.open && !(S.poll.mine || []).length)
    kids.push(h("button", {class: "req", type: "button", style: {"text-align": "left"}, onclick: () => go("live")}, h("div", "row nowrap", h("span", "tag flag live", "Live poll"), h("b", "grow", S.poll.question), I("right"))));
  const nm = nextMission();
  kids.push(h("div", "card lift stack", h("div", "strength",
    h("div", {class: "ring", style: {"--p": g.strength, "--s": "68px"}}, h("div", null, h("b", null, g.strength + "%"))),
    h("div", "grow", h("p", "h3", g.strength >= 100 ? "Your profile is complete" : "Profile strength"),
      h("p", "small dim", g.strength >= 100 ? "You're getting the sharpest matches we can find." : "A fuller profile means sharper matches."),
      g.strength < 100 ? h("button", {class: "linkbtn small", type: "button", onclick: () => editProfile(g.strength < 70 ? 1 : 3)}, "Complete my profile") : null)),
    nm ? missionBtn(nm) : null));

  if (s.incoming.length) {
    kids.push(h("div", {class: "sect-h", id: "requests"}, h("h2", "h2", "Wants to meet you"), h("span", "pip inline", s.incoming.length)));
    for (const r of s.incoming) {
      const pp = S.byId.get(r.id) || r;
      kids.push(h("div", "req", h("button", {class: "row nowrap", type: "button", style: {"text-align": "left"}, onclick: () => openPerson(r.id)}, av(pp, 52),
          h("span", "grow", h("b", {style: {display: "block", "font-size": "16px"}}, r.name), h("span", "small dim", sub(r)))),
        r.msg ? h("blockquote", "msg", "“" + r.msg + "”") : null,
        h("div", "row nowrap", h("button", {class: "btn primary grow", type: "button", onclick: () => compose(pp, "accept")}, "Accept and match"),
          h("button", {class: "btn ghost", type: "button", onclick: e => busy(e.currentTarget, null, async () => { await authed("decline", {other: r.id}); await doSync(); })}, "Not now"))));
    }
  }

  if (s.matches.length) {
    kids.push(h("div", "sect-h", h("h2", "h2", "Your matches"), s.matches.length > 1 ? h("button", {class: "linkbtn small", type: "button", onclick: () => download("sme-forum-contacts.vcf", vcard(s.matches), "text/vcard")}, "Save all contacts") : null));
    kids.push(h("div", "list", s.matches.map(m => {
      const pp = S.byId.get(m.id) || m;
      return prow(pp, m.unread ? h("span", "pip inline", m.unread) : I("chat"), () => openMatch(m.id), m.last ? (m.last.mine ? "You: " : "") + m.last.t : "Matched. Say hello and agree where to meet.");
    })));
  }
  const skip = new Set([...s.matches.map(m => m.id), ...s.incoming.map(m => m.id), ...s.declined]);
  const top = S.ranked.filter(r => !skip.has(r.p.id)).slice(0, 10);
  kids.push(h("div", "sect-h", h("h2", "h2", "People you should meet"), top.length ? h("button", {class: "linkbtn small", type: "button", onclick: () => go("people")}, "See everyone") : null));
  if (top.length) {
    kids.push(h("div", "deck", top.map((r, i) => {
      const q = r.p, state = rel(q.id);
      const act = q.example ? h("button", {class: "btn block", type: "button", disabled: true}, "Example person")
        : state === "sent" ? h("button", {class: "btn block", type: "button", onclick: () => openPerson(q.id)}, I("check"), "Request sent")
        : h("button", {class: "btn primary block", type: "button", onclick: () => compose(q, "ask")}, "Ask to meet");
      return h("article", {class: "mcard", style: {"--c": S.color[q.sector] || "#e8a892"}},
        h("span", "rank", "MATCH " + String(i + 1).padStart(2, "0")),
        h("button", {class: "head", type: "button", style: {"text-align": "left"}, onclick: () => openPerson(q.id)}, av(q, 60),
          h("span", "grow", h("span", {class: "name", style: {display: "block"}}, q.name), h("span", "small dim", sub(q)), h("span", {class: "tags", style: {"margin-top": "6px"}}, flags(q)))),
        fitline(r), whyList(r.reasons, 3), h("div", {style: {"margin-top": "auto"}}, act));
    })));
  } else {
    const few = S.people.length < 6;
    kids.push(h("div", "empty", I("spark"), h("b", null, few ? "The room is still filling up" : "No new suggestions right now"),
      h("p", "small", few ? "Your matches appear here as people join. Check back at the coffee break." : "You've seen everyone we'd suggest for now. New people are added as they join."),
      few && !S.showEx ? h("button", {class: "btn small", type: "button", onclick: () => { S.showEx = true; recompute(); refresh(); }}, "Preview with example people") : null));
  }

  const sent = s.sent.map(id => S.byId.get(id)).filter(Boolean);
  if (sent.length) {
    kids.push(h("div", "sect-h", h("h2", "h2", "Waiting for a reply")));
    kids.push(h("div", "list", sent.map(q => prow(q, h("span", "tiny faint", "Sent")))));
  }
  if (S.showEx) kids.push(h("button", {class: "linkbtn small", type: "button", style: {"align-self": "center"}, onclick: () => { S.showEx = false; recompute(); refresh(); }}, "Hide example people"));
  view.replaceChildren(...kids);
  for (const svg of view.querySelectorAll(".prow > svg")) Object.assign(svg.style, {width: "20px", height: "20px", color: "var(--rose)", flex: "none"});
}

// =====================================================================
// Tab 2: People (the map, search and filters)
// =====================================================================
let sky = null;
const FILTERS = [["all", "Everyone"], ["offers", "Offers what I need"], ["wants", "Needs what I offer"], ["asked", "Who I asked to meet"], ["sector", "My sector"], ["speakers", "Speakers"]];
function people() {
  S.filter = S.filter || "all";
  const skyEl = h("div", "sky", h("canvas", {"aria-label": "Map of everyone in the room. Each star is a person, coloured by sector."}), h("div", "legend"));
  const search = h("input", {type: "search", placeholder: "Search by name, organisation or role", "aria-label": "Search people", value: S.search || "", oninput: e => { S.search = e.target.value; peopleList(); }});
  const filters = h("div", "filters", FILTERS.map(([k, name]) => { const b = chip(name, S.filter === k, () => { S.filter = k; for (const x of b.parentNode.children) x.setAttribute("aria-pressed", "false"); peopleList(); return true; }); return b; }));
  view.replaceChildren(h("div", "people-grid", skyEl,
    h("div", "stack", h("div", "stack tight", h("p", "eyebrow", "The room"), h("h1", {class: "h1", id: "roomCount"})), search, filters, h("div", {class: "list", id: "plist"}),
      h("label", {class: "row nowrap small dim", style: {cursor: "pointer"}}, h("input", {type: "checkbox", class: "switch", checked: !!S.showEx, onchange: e => { S.showEx = e.target.checked; recompute(); peopleUpdate(); }}), "Show example people, to see how matching works"))));
  sky = Sky(skyEl, {sectors: S.sectors, color: S.color, onPick: p => openPerson(p.id)});
  peopleUpdate();
}
function peopleUpdate() {
  if (!sky || !$("plist")) return;
  sky.set(S.all, S.me.id, skyLinks(S.all));
  const n = S.people.length;
  $("roomCount").textContent = n === 1 ? "You're the first one here" : `${n} people, ${new Set(S.people.map(p => p.sector)).size} sectors`;
  peopleList();
}
function peopleList() {
  const box = $("plist"); if (!box) return;
  const me = S.meP, q = (S.search || "").trim().toLowerCase(), f = S.filter;
  const mine = new Set(me.interests || []);
  const has = (p, side, other) => (p.interests || []).some(i => i.endsWith(":" + side) && mine.has(i.split(":")[0] + ":" + other));
  let list = S.all.filter(p => p.id !== S.me.id);
  if (q) list = list.filter(p => (p.name + " " + p.company + " " + p.role + " " + p.sector).toLowerCase().includes(q));
  if (f === "offers") list = list.filter(p => has(p, "give", "get"));
  if (f === "wants") list = list.filter(p => has(p, "get", "give"));
  if (f === "asked") list = list.filter(p => (me.meet || []).some(k => M.fits(k, me, p)));
  if (f === "sector") list = list.filter(p => p.sector === me.sector);
  if (f === "speakers") list = list.filter(p => p.speaker);
  list.sort((a, b) => ((S.rankOf.get(b.id) || {}).total || 0) - ((S.rankOf.get(a.id) || {}).total || 0) || a.name.localeCompare(b.name));
  const state = {match: "Matched", sent: "Sent", incoming: "Wants to meet"};
  box.replaceChildren(...(list.length ? list.slice(0, 150).map(p => { const r = S.rankOf.get(p.id), st = state[rel(p.id)];
    return prow(p, h("span", "fit", st || (r ? r.fit + "%" : ""))); })
    : [h("div", "empty", I("search"), h("p", "small", f === "asked" && !(me.meet || []).length ? "Tell us who you'd like to meet and they'll show up here." : "Nobody here yet for this filter."),
        f === "asked" && !(me.meet || []).length ? h("button", {class: "btn small", type: "button", onclick: () => editProfile(3)}, "Choose who to meet") : null)]));
}

// ---------- a person ----------
function openPerson(id) {
  const p = S.byId.get(id); if (!p) return toast("That person is no longer on the map.", {warn: true});
  if (rel(id) === "match") return openMatch(id);
  sheet((box, ctl) => {
    const r = S.rankOf.get(id), state = rel(id), inc = S.sync.incoming.find(x => x.id === id);
    const meta = [p.sector !== "Other" ? p.sector : "", label(S.cfg.orgTypes, p.orgtype), label(S.cfg.stages, p.stage, true)].filter(Boolean);
    box.append(h("div", "phead", av(p, 72), h("div", "grow", h("h2", "h1", p.name), h("p", "dim", sub(p)), h("div", {class: "tags", style: {"margin-top": "8px"}}, flags(p)))),
      h("div", "tags", meta.map(t => h("span", "tag", t))));
    if (p.example) box.append(h("p", "note", "This is an example person, shown so you can see how matching works. They can't be contacted."));
    if (inc && inc.msg) box.append(h("blockquote", "msg", "“" + inc.msg + "”"));
    if (r && r.reasons.length) box.append(h("div", "card stack", h("p", "eyebrow", "Why you should meet"), fitline(r), whyList(r.reasons, 5)));
    const give = words(p, "give"), get = words(p, "get");
    if (give.length) box.append(h("div", "group", h("h3", null, "Offers"), h("div", "tags", give.map(w => h("span", "tag give", w)))));
    if (get.length) box.append(h("div", "group", h("h3", null, "Looking for"), h("div", "tags", get.map(w => h("span", "tag get", w)))));
    if ((p.topics || []).length) box.append(h("div", "group", h("h3", null, "Wants AI to work for"), h("div", "tags", p.topics.map(t => h("span", "tag", label(S.cfg.topics, t))))));
    if (p.work) box.append(h("div", "group", h("h3", null, "Working on"), h("p", "dim", p.work)));
    if (S.sync.ai && !p.example) {
      const out = h("div", "stack tight"), b = h("button", {class: "btn small", type: "button"}, I("spark"), "Suggest an opening line");
      b.onclick = () => busy(b, null, async () => { const j = await authed("icebreaker", {other: id}); b.remove(); out.append(h("div", "ai", j.opener + (j.explore ? "\n\n" + j.explore : "")), h("p", "note", AI_LABEL)); });
      box.append(out, b);
    }
    const foot = h("div", {class: "stack tight", style: {position: "sticky", bottom: "0", "padding-top": "8px"}});
    if (p.example) {}
    else if (state === "incoming") foot.append(h("button", {class: "btn primary block", type: "button", onclick: () => { ctl.close(); compose(p, "accept"); }}, "Accept and match"));
    else if (state === "sent") foot.append(h("p", {class: "note ok", style: {"text-align": "center"}}, "Request sent. You'll be told the moment they accept."),
      h("button", {class: "btn block", type: "button", onclick: e => busy(e.currentTarget, null, async () => { await authed("connect", {other: id, undo: true}); await doSync(); ctl.close(); toast("Request withdrawn"); })}, "Withdraw request"));
    else foot.append(h("button", {class: "btn primary block", type: "button", onclick: () => { ctl.close(); compose(p, "ask"); }}, "Ask to meet"));
    box.append(foot);
  }, {label: p.name});
}

/** The three "share my …" switches, used when asking, accepting and afterwards. */
function shareToggles(cur, onChange) {
  const p = S.sync.profile, val = {mobile: p.hide_mobile ? "" : p.mobile, email: p.email, linkedin: p.linkedin};
  const state = Object.assign({mobile: true, email: true, linkedin: true}, cur);
  return {state, el: h("div", "sharegrid", Object.keys(DETAIL).map(k => {
    const has = !!val[k];
    return h("label", null, h("span", null, k === "linkedin" ? "LinkedIn or website" : k[0].toUpperCase() + k.slice(1), h("small", null, has ? val[k] : k === "mobile" && p.hide_mobile ? "Hidden in your profile" : "Not on your contact card")),
      h("input", {type: "checkbox", class: "switch", checked: has && state[k], disabled: !has, onchange: e => { state[k] = e.target.checked; onChange && onChange(state); }}));
  }))};
}
/** Ask someone to meet, or accept their request. Contact details are only swapped once both agree. */
function compose(p, mode) {
  sheet((box, ctl) => {
    const ask = mode === "ask", sh = shareToggles();
    const msg = h("textarea", {maxlength: "200", rows: "3", "aria-label": "Your message"}, ask ? S.cfg.requestDefault : "");
    const b = h("button", {class: "btn primary block", type: "button"}, ask ? "Send request" : "Accept and match"), note = h("p", {class: "note", role: "alert"});
    b.onclick = () => busy(b, note, async () => {
      const j = await authed("connect", {other: p.id, msg: ask ? msg.value.trim() : "", share: sh.state});
      ctl.close(); await doSync();
      if (j.state === "requested") toast("Request sent to " + first(p.name), {icon: "send"});
    });
    box.append(h("div", "phead", av(p, 56), h("div", "grow", h("p", "eyebrow", ask ? "Ask to meet" : "Accept and match"), h("h2", "h2", p.name), h("p", "small dim", sub(p)))),
      ask ? field("Your message", msg) : h("p", "dim", "Accepting makes it a match. You can then message each other to agree where to meet."),
      h("div", "group", h("h3", null, "Share with " + first(p.name) + (ask ? " if they accept" : "")), sh.el,
        h("p", "note", ask ? "Nothing is shared unless they accept. You can change this for each person at any time." : "You can change this at any time.")),
      note, b);
  }, {label: mode === "ask" ? "Ask to meet" : "Accept and match"});
}

// ---------- "It's a match" ----------
let celebrating = false;
function celebrate(m) {
  if (celebrating) return; celebrating = true;
  const p = S.byId.get(m.id) || m, me = S.meP || S.sync.profile, cv = h("canvas", {"aria-hidden": "true"});
  const close = (then) => { el.classList.add("out"); setTimeout(() => { st.stop(); el.remove(); celebrating = false; then && then(); }, 350); };
  const el = h("div", {class: "celebrate", role: "dialog", "aria-label": "It's a match"}, cv, h("div", "in",
    h("div", "duo", av(me, 88), av(p, 88)),
    h("h1", "big", span("It's a <em>match.</em>")),
    h("p", "dim", `You and ${p.name} both want to meet. Say hello and agree where.`),
    h("button", {class: "btn primary block", type: "button", onclick: () => close(() => openMatch(m.id))}, "Say hello"),
    h("button", {class: "btn ghost block", type: "button", onclick: () => close()}, "Later")));
  document.body.append(el);
  const st = Stars(cv); st.connect(1); setTimeout(() => st.burst(undefined, innerHeight * .3, 110), 450); buzz([30, 60, 30, 60, 60]);
}

// ---------- a match: contact card, sharing, chat ----------
function cardLines(m) {
  const c = m.card || {}, out = [];
  if (c.mobile) out.push(h("a", {href: "tel:" + c.mobile.replace(/\s/g, "")}, I("phone"), c.mobile));
  if (c.email) out.push(h("a", {href: "mailto:" + c.email}, I("mail"), c.email));
  if (c.linkedin) out.push(h("a", {href: c.linkedin, target: "_blank", rel: "noopener"}, I("link"), c.linkedin.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")));
  return out;
}
function vcard(list) {
  const esc = v => String(v || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
  return list.map(x => { const c = x.card || {}; const L = ["BEGIN:VCARD", "VERSION:3.0", "FN:" + esc(x.name), "N:" + esc(x.name) + ";;;;"];
    if (x.company) L.push("ORG:" + esc(x.company)); if (x.role) L.push("TITLE:" + esc(x.role));
    if (c.mobile) L.push("TEL;TYPE=CELL:" + c.mobile); if (c.email) L.push("EMAIL:" + c.email); if (c.linkedin) L.push("URL:" + c.linkedin);
    L.push("NOTE:" + esc("Met at " + S.cfg.eventName + ", " + S.cfg.date)); L.push("END:VCARD"); return L.join("\r\n"); }).join("\r\n");
}
function openMatch(id) {
  const m0 = S.sync.matches.find(x => x.id === id); if (!m0) return openPerson(id);
  const p = S.byId.get(id) || m0;
  let timer = 0, count = -1, alive = true;
  S.chatWith = id;
  sheet((box, ctl) => {
    const cardBox = h("div", "cardbox"), chat = h("div", {class: "chat", "aria-live": "polite"});
    const ta = h("textarea", {rows: "1", maxlength: "500", placeholder: "Message " + first(p.name), "aria-label": "Message"});
    const sendB = h("button", {class: "iconbtn", type: "button", "aria-label": "Send"}, I("send"));
    const m = () => S.sync.matches.find(x => x.id === id) || m0;
    function paintCard() {
      const c = m().card || {}, missing = Object.keys(DETAIL).filter(k => !c[k]);
      cardBox.replaceChildren(...cardLines(m()), ...missing.map(k => h("div", "ln", I(k === "mobile" ? "phone" : k === "email" ? "mail" : "link"), h("span", null, "No " + DETAIL[k] + " shared"),
        h("button", {class: "linkbtn", type: "button", onclick: e => busy(e.currentTarget, null, async () => { await authed("msg_send", {other: id, ask: k}); await load(); })}, "Ask"))));
    }
    async function load() {
      const j = await authed("msgs", {other: id});
      if (!alive || j.items.length === count) return;
      count = j.items.length;
      const my = m().myShare || {}, prof = S.sync.profile;
      chat.replaceChildren(...(j.items.length ? j.items.map(x => {
        const b = h("div", "bub" + (x.mine ? " mine" : ""), x.t, h("small", null, clock(x.at)));
        if (x.ask && !x.mine && !my[x.ask] && prof[x.ask] && !(x.ask === "mobile" && prof.hide_mobile))
          b.append(h("button", {class: "btn small primary", type: "button", onclick: e => busy(e.currentTarget, null, async () => {
            await authed("share", {other: id, share: Object.assign({}, my, {[x.ask]: true})});
            await authed("msg_send", {other: id, text: "Done, I've shared my " + DETAIL[x.ask] + " with you."});
            await doSync(); count = -1; await load(); paintShare();
          })}, "Share my " + DETAIL[x.ask]));
        return b;
      }) : [h("p", {class: "note", style: {"text-align": "center", margin: "auto"}}, "This is the start of your conversation. Only the two of you can read it.")]));
      chat.scrollTop = chat.scrollHeight;
      doSync().then(paintCard).catch(() => {});
    }
    async function send(text) {
      text = (text || "").trim(); if (!text) return;
      sendB.disabled = true;
      try { await authed("msg_send", {other: id, text}); ta.value = ""; await load(); } catch (e) { toast(e.message, {warn: true}); } finally { sendB.disabled = false; }
    }
    sendB.onclick = () => send(ta.value);
    ta.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && matchMedia("(pointer:fine)").matches) { e.preventDefault(); send(ta.value); } });
    const shareBox = h("div");
    function paintShare() {
      const sh = shareToggles(m().myShare, st => { authed("share", {other: id, share: st}).then(() => doSync()).catch(e => toast(e.message, {warn: true})); });
      shareBox.replaceChildren(sh.el);
    }
    box.append(h("div", "phead", av(p, 60), h("div", "grow", h("p", "eyebrow", "Matched"), h("h2", "h2", p.name), h("p", "small dim", sub(p)))),
      cardBox,
      h("div", "row", h("button", {class: "btn small", type: "button", onclick: () => download(p.name.replace(/[^\w ]/g, "") + ".vcf", vcard([m()]), "text/vcard")}, I("download"), "Save contact"),
        h("details", {class: "grow", style: {"min-width": "100%"}}, h("summary", {class: "linkbtn small", style: {cursor: "pointer", "list-style": "none"}}, "What I share with " + first(p.name)), shareBox)),
      chat, h("div", "quick", S.cfg.meetups.map(t => h("button", {class: "chip", type: "button", onclick: () => send(t)}, t))),
      h("div", "chatbar", ta, sendB));
    paintCard(); paintShare();
    load().catch(e => toast(e.message, {warn: true}));
    timer = setInterval(() => { if (!document.hidden) load().catch(() => {}); }, 4000);
  }, {full: true, label: "Match with " + p.name, onClose: () => { alive = false; clearInterval(timer); S.chatWith = null; doSync().catch(() => {}); }});
}

// ---------- notifications ----------
function openNotifs() {
  sheet((box, ctl) => {
    const ns = S.sync.notifs, text = {request: " would like to meet you", match: " and you are a match", message: " sent you a message"};
    box.append(h("h2", "h1", "Notifications"));
    if (!ns.length) box.append(h("div", "empty", I("bell"), h("p", "small", "Nothing yet. You'll see requests, matches and messages here.")));
    box.append(h("div", "list", ns.map(n => h("button", {class: "nrow" + (n.read ? "" : " unread"), type: "button", onclick: () => { ctl.close(); n.type === "request" ? (rel(n.from) === "incoming" ? openPerson(n.from) : go("home")) : openMatch(n.from); }},
      av(S.byId.get(n.from) || n, 40), h("span", "t", h("b", null, n.name), text[n.type] || "", h("small", null, ago(n.at)))))));
    if (!S.pushOn) box.append(h("button", {class: "btn block", type: "button", onclick: () => { ctl.close(); enablePush(); }}, I("bell"), "Get these on your lock screen"));
    if (S.sync.unread) authed("notif_read").then(() => doSync()).catch(() => {});
  }, {label: "Notifications"});
}

// =====================================================================
// Tab 3: Agenda and the brief
// =====================================================================
function maltaNow() {
  const f = new Intl.DateTimeFormat("en-GB", {timeZone: "Europe/Malta", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false});
  const p = Object.fromEntries(f.formatToParts(new Date()).map(x => [x.type, x.value]));
  return {date: `${p.year}-${p.month}-${p.day}`, mins: (+p.hour % 24) * 60 + (+p.minute)};
}
const toMins = t => { const [a, b] = t.split(":").map(Number); return a * 60 + b; };
function currentItem() { const n = maltaNow(); return n.date !== S.cfg.date ? null : S.cfg.agenda.find(a => n.mins >= toMins(a.time) && n.mins < toMins(a.time) + a.mins) || null; }
function agenda() {
  const now = currentItem();
  view.replaceChildren(
    h("div", "stack tight", h("p", "eyebrow", "Tuesday 24 November 2026"), h("h1", "serif"), h("p", "small dim", S.cfg.venue)),
    h("button", {class: "brief-card", type: "button", onclick: openBrief}, I("doc"), h("span", "grow", h("b", {style: {display: "block"}}, "Read the conference brief"), h("span", "small dim", "Making AI work for SMEs: from policy to practice. A 5-minute read.")), mission("brief").done ? I("check") : h("span", "xpchip", "+20 XP")),
    h("div", null, S.cfg.agenda.map(a => h("div", "ag" + (a === now ? " now" : ""),
      h("div", "ag-time", a.time, a === now ? h("div", {style: {"margin-top": "6px"}}, h("span", "tag flag live", "Now")) : null),
      h("div", null, h("div", "ag-title", a.title), a.who ? h("div", "ag-who", a.who) : null,
        a.people.length ? h("details", null, h("summary", null, a.people.length + " speakers"), h("ul", null, a.people.map(t => { const i = t.indexOf(","); return h("li", null, h("b", null, i < 0 ? t : t.slice(0, i)), i < 0 ? "" : t.slice(i)); }))) : null,
        a.qa ? h("button", {class: "linkbtn tiny", type: "button", style: {"margin-top": "8px"}, onclick: () => { S.qaSession = a.qa; go("live"); }}, "Ask a question") : null)))));
  const t = view.querySelector("h1.serif"); t.style.fontSize = "clamp(34px,9vw,44px)"; t.append(span("The <em>morning.</em>"));
}
async function openBrief() {
  let b; try { b = await (await fetch("assets/brief.json")).json(); } catch { return toast("The brief could not be loaded. Try again.", {warn: true}); }
  sheet(box => {
    box.append(h("div", "reader stack", h("p", "eyebrow", b.by), h("h1", {class: "serif", style: {"font-size": "clamp(34px,9vw,46px)"}}, b.title),
      b.sections.map(s => [h("h2", null, s.h), s.p.map(t => h("p", null, t))])));
  }, {full: true, label: "Conference brief"});
  if (!mission("brief").done) authed("flag", {key: "brief"}).then(() => doSync()).catch(() => {});
}

// =====================================================================
// Tab 4: Live (poll and questions from the floor)
// =====================================================================
async function loadPoll() {
  const j = await api("poll", null, "&device=" + device());
  const was = S.poll && S.poll.open && S.poll.id;
  S.poll = j.poll;
  if (j.poll && j.poll.open && was !== j.poll.id && !(j.poll.mine || []).length && S.tab !== "live") toast("A live poll is open. Have your say.", {icon: "live", ms: 7000, onclick: () => go("live")});
  chrome(); if (S.tab === "live") pollCard(); else refresh();
}
async function loadQuestions() {
  const j = await api("questions", null, "&device=" + device());
  S.questions = j.items; if (S.tab === "live") questionList();
}
function live() {
  S.qaSession = S.qaSession || (currentItem() || {}).qa || "gen";
  const ta = h("textarea", {maxlength: "280", rows: "3", placeholder: "What would you like to ask?", "aria-label": "Your question"});
  const named = h("input", {type: "checkbox", checked: true}), note = h("p", {class: "note", role: "alert"});
  const b = h("button", {class: "btn primary block", type: "button"}, "Send my question");
  b.onclick = () => busy(b, note, async () => {
    await api("ask", {session: S.qaSession, text: ta.value, name: named.checked ? S.sync.profile.name : "", device: device(), id: S.me.id, token: S.me.token});
    ta.value = ""; toast("Question sent to the moderator", {icon: "send"}); await loadQuestions(); doSync().catch(() => {});
  });
  view.replaceChildren(
    h("div", "stack tight", h("p", "eyebrow", "Live"), h("h1", {class: "serif", style: {"font-size": "clamp(34px,9vw,44px)"}}, span("Have your <em>say.</em>"))),
    h("div", {id: "pollBox"}),
    h("div", "card stack", h("h2", "h2", "Ask a question from the floor"),
      h("div", "chips", S.cfg.qa.map(s => { const c = chip(s.label, S.qaSession === s.key, () => { S.qaSession = s.key; for (const x of c.parentNode.children) x.setAttribute("aria-pressed", "false"); questionList(); return true; }); return c; })),
      ta, h("label", "check", named, h("span", null, "Show my name with the question")), note, b),
    h("div", "sect-h", h("h2", "h2", "Questions so far"), h("span", "small dim", "Vote for the ones you want answered")),
    h("div", {class: "list", id: "qlist"}));
  pollCard(); questionList();
}
function liveUpdate() { pollCard(); }
function pollCard() {
  const box = $("pollBox"); if (!box) return;
  const p = S.poll;
  if (!S.cfg.polls || !p) { box.replaceChildren(S.cfg.polls ? h("div", "empty", I("live"), h("p", "small", "No poll is open right now. The host will open one from the stage.")) : ""); box.dataset.sig = ""; return; }
  const sg = JSON.stringify([p.id, p.open, p.counts, p.mine]); if (box.dataset.sig === sg) return; box.dataset.sig = sg;
  const mine = new Set(p.mine || []), voted = mine.size > 0, total = Math.max(1, p.voters);
  const card = h("div", "card stack" + (p.open ? " poll-live" : ""), h("div", "row", h("span", "tag flag" + (p.open ? " live" : ""), p.open ? "Poll open" : "Poll closed"), p.max > 1 && p.open ? h("span", "small dim", "Pick up to " + p.max) : null), h("h2", "h2", p.question));
  if (p.open && !voted) {
    const pick = new Set(), go2 = h("button", {class: "btn primary block", type: "button", disabled: true}, "Vote");
    card.append(h("div", "stack tight", p.options.map((o, i) => { const b = h("button", {class: "opt-card", type: "button", "aria-pressed": "false"}, h("span", "dot"), o);
      b.onclick = () => { if (p.max === 1) { pick.clear(); for (const x of b.parentNode.children) x.setAttribute("aria-pressed", "false"); }
        if (pick.has(i)) pick.delete(i); else if (pick.size < p.max) pick.add(i); else return toast("Pick up to " + p.max + ".", {warn: true});
        b.setAttribute("aria-pressed", String(pick.has(i))); go2.disabled = !pick.size; };
      return b; })), go2);
    go2.onclick = () => busy(go2, null, async () => { await api("pvote", {pid: p.id, device: device(), choices: [...pick]}); authed("flag", {key: "poll"}).then(() => doSync()).catch(() => {}); await loadPoll(); });
  } else {
    card.append(h("div", "stack", p.options.map((o, i) => { const pct = Math.round(p.counts[i] / total * 100);
      return h("div", "pbar" + (mine.has(i) ? " mine" : ""), h("div", "pbar-top", h("span", "pbar-label", o, mine.has(i) ? " ✓" : ""), h("span", "pbar-n", pct + "%")), h("div", "bar", h("i", {style: {width: pct + "%"}})));
    })), h("p", "small dim", p.voters + (p.voters === 1 ? " vote" : " votes") + (voted && p.open ? ". Thanks for voting." : "")));
  }
  box.replaceChildren(card);
}
function questionList() {
  const box = $("qlist"); if (!box) return;
  const items = (S.questions || []).filter(q => q.s === S.qaSession);
  box.replaceChildren(...(items.length ? items.map(q => {
    const v = h("button", {class: "vote" + (q.mine ? " on" : ""), type: "button", "aria-label": "Vote for this question", "aria-pressed": String(!!q.mine)}, I("up"), String(q.votes));
    v.onclick = async () => { try { await api("vote", {qid: q.id, device: device()}); await loadQuestions(); } catch (e) { toast(e.message, {warn: true}); } };
    return h("div", "q" + (q.answered ? " done" : ""), v, h("div", "grow", h("p", "q-text", q.text), h("p", "q-meta", (q.name || "Anonymous") + (q.answered ? " · answered" : ""))));
  }) : [h("div", "empty", h("p", "small", "No questions for this session yet. Be the first."))]));
}

// =====================================================================
// Tab 5: Me (profile, level, missions, leaderboard, settings)
// =====================================================================
function editProfile(step) {
  stopLoops(); closeSheets();
  wizard({profile: S.sync.profile, step, onCancel: app, onDone: async () => { await loadPeople(true); app(); await doSync(); toast("Profile saved"); }});
}
function me() {
  const s = S.sync, p = s.profile, g = s.game, a = s.account;
  const pct = g.next ? Math.round((g.xp - g.floor) / (g.next - g.floor) * 100) : 100;
  const setrow = (icon, title, text, right, onclick) => h(onclick ? "button" : "div", Object.assign({class: "setrow", style: {width: "100%", "text-align": "left"}}, onclick ? {type: "button", onclick} : {}), I(icon), h("span", "t", h("b", null, title), h("span", null, text)), right || (onclick ? I("right") : null));
  const pushSw = h("input", {type: "checkbox", class: "switch", checked: !!S.pushOn, "aria-label": "Notifications", onchange: e => { e.target.checked ? enablePush().then(() => { e.target.checked = !!S.pushOn; }) : disablePush(); }});
  const boardSw = h("input", {type: "checkbox", class: "switch", checked: !("board" in p) || !!p.board, "aria-label": "Show me on the leaderboard", onchange: e => {
    authed("profile", Object.assign({}, p, {consent: true, board: e.target.checked})).then(() => doSync()).then(loadBoard).catch(er => toast(er.message, {warn: true})); }});
  const lb = h("div", {id: "board"}, h("p", "small dim", "Loading…"));
  view.replaceChildren(
    h("div", "card lift me-card", av(p, 84), h("div", null, h("h1", "h1", p.name), h("p", "dim", sub(p))),
      h("div", "tags", [p.sector !== "Other" ? p.sector : "", label(S.cfg.orgTypes, p.orgtype), label(S.cfg.stages, p.stage, true)].filter(Boolean).map(t => h("span", "tag", t))),
      h("button", {class: "btn small", type: "button", onclick: () => editProfile(0)}, I("edit"), "Edit profile")),
    h("div", "card level", h("div", "top", h("div", {class: "ring", style: {"--p": pct, "--c": "var(--gold)", "--s": "62px"}}, I("star")),
        h("div", "grow", h("p", "eyebrow", "Level " + (g.level + 1) + " of " + S.cfg.levels.length), h("p", "lv", g.levelName)), h("b", {style: {color: "var(--gold)", font: "500 14px var(--mono)"}}, g.xp + " XP")),
      h("div", "bar", h("i", {style: {width: pct + "%"}})),
      h("p", "small dim", g.next ? `${g.next - g.xp} XP to ${g.nextName}. ${g.matches} ${g.matches === 1 ? "match" : "matches"} so far.` : `Top level reached. ${g.matches} matches so far.`)),
    h("div", "card", h("div", "row between", h("h2", "h2", "Missions"), h("span", "small dim", g.missions.filter(m => m.done).length + " of " + g.missions.length)),
      h("div", "mlist", [...g.missions].sort((x, y) => x.done - y.done).map(m => h(m.done ? "div" : "button", Object.assign({class: "mrow" + (m.done ? " done" : ""), style: {width: "100%", "text-align": "left"}}, m.done ? {} : {type: "button", onclick: () => doMission(m.key)}),
        h("span", "tick", m.done ? I("check") : null), h("span", "t", m.label), h("span", "xp", "+" + m.xp))))),
    h("div", "card", h("div", "row between", h("h2", "h2", "Top connectors"), I("trophy")), lb),
    h("div", "card", h("h2", "h2", "Settings"),
      setrow("bell", "Notifications", S.pushOn ? "On for this device" : pushHint(), pushSw),
      standalone() ? setrow("phoneadd", "Installed", "You're using the app from your home screen.", I("check")) : setrow("phoneadd", "Add to home screen", "One tap to open, and needed for notifications on iPhone.", null, install),
      setrow("trophy", "Show me on the leaderboard", "Your name and XP in Top connectors.", boardSw),
      setrow("lock", a.email || "Sign-in", a.email ? (a.hasPassword ? "Change your email or password" : "Add a password") : "Add an email and password", null, () => secure()),
      setrow("shield", "Privacy notice", "What we keep and why. " + S.cfg.retention, null, () => window.open("privacy.html", "_blank", "noopener")),
      setrow("logout", "Sign out", "On this device", null, signOut),
      setrow("trash", "Delete my account", "Removes your profile, matches and messages for good.", null, removeMe)),
    h("p", {class: "tiny faint", style: {"text-align": "center"}}, "SME Constellation " + S.cfg.version + " · run for " + S.cfg.controller));
  for (const x of view.querySelectorAll(".setrow > svg:last-child, .card > .row > svg")) Object.assign(x.style, {width: "20px", height: "20px", color: "var(--faint)", flex: "none"});
  loadBoard();
}
async function loadBoard() {
  const box = $("board"); if (!box) return;
  try {
    const j = await authed("leaderboard");
    if (!$("board")) return;
    box.replaceChildren(...(j.top.length ? j.top.map((r, i) => h("div", "lb" + (r.id === S.me.id ? " me" : ""), h("span", "n", i + 1), h("div", {class: "avatar", style: {"--s": "30px", "--c": S.color[r.sector] || "#b0acd0"}}, initials(r.name)),
      h("span", "grow", r.name, r.id === S.me.id ? " (you)" : ""), h("span", "xp", r.xp + " XP"))) : [h("p", "small dim", "Nobody on the board yet.")]),
      j.rank ? h("p", {class: "small dim", style: {"margin-top": "8px"}}, `You're number ${j.rank} of ${j.of}.`) : "");
  } catch {}
}
function secure() {
  sheet((box, ctl) => {
    const a = S.sync.account;
    const em = h("input", {type: "email", autocomplete: "username", inputmode: "email", maxlength: "120", value: a.email || S.sync.profile.email || "", placeholder: "name@company.com"});
    const pw = pwField(a.hasPassword ? "New password" : "Choose a password", "new-password"), note = h("p", {class: "note", role: "alert"});
    const b = h("button", {class: "btn primary block", type: "button"}, "Save");
    b.onclick = () => busy(b, note, async () => { await authed("secure", {email: em.value.trim(), password: pw.inp.value}); await doSync(); ctl.close(); toast("Sign-in details saved"); });
    box.append(h("h2", "h1", a.email ? "Your sign-in" : "Keep your profile safe"), h("p", "dim small", "Use these to sign in on another phone or computer. Your sign-in email is never shown to other attendees."), field("Email", em), pw.el, note, b);
  }, {label: "Sign-in details"});
}
async function signOut() {
  const a = S.sync.account;
  if (!a.email && !a.google && !a.microsoft) { toast("Add an email and password first, or you won't be able to sign back in.", {warn: true, ms: 6000}); return secure(); }
  const sub = await currentSub();
  try { await authed("logout", {endpoint: sub ? sub.endpoint : ""}); } catch {}
  if (sub) sub.unsubscribe().catch(() => {});
  signedOut(false);
}
function removeMe() {
  sheet((box, ctl) => {
    const b = h("button", {class: "btn danger block", type: "button"}, "Delete everything");
    b.onclick = () => busy(b, null, async () => { await authed("remove"); ctl.close(); signedOut(false); toast("Your account has been deleted"); });
    box.append(h("h2", "h1", "Delete your account?"), h("p", "dim", "This removes your profile from the map, your matches, your messages and your sign-in. It can't be undone."), b, h("button", {class: "btn ghost block", type: "button", onclick: ctl.close}, "Keep my account"));
  }, {label: "Delete account"});
}

// =====================================================================
// Installing and notifications
// =====================================================================
let installEvt = null;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; });
addEventListener("appinstalled", () => { installEvt = null; if (S.me) authed("flag", {key: "install"}).then(() => doSync()).catch(() => {}); });
const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
async function install() {
  if (standalone()) return toast("You're already using the installed app");
  if (installEvt) { installEvt.prompt(); const r = await installEvt.userChoice.catch(() => null); installEvt = null; if (r && r.outcome === "accepted") toast("Installed. Find SME Forum on your home screen."); return; }
  sheet(box => {
    box.append(h("h2", "h1", "Add to your home screen"), h("p", "dim", "It opens like any other app, full screen, and it's how notifications work on iPhone."));
    if (isIOS) box.append(h("ol", "ios-steps", h("li", null, h("span", null, "Open this page in ", h("b", null, "Safari"), " (not inside another app).")), h("li", null, h("span", null, "Tap the ", h("b", null, "Share"), " button ", I("share"))),
      h("li", null, h("span", null, "Scroll down and tap ", h("b", null, "Add to Home Screen"), " ", I("plusbox"))), h("li", null, h("span", null, "Open ", h("b", null, "SME Forum"), " from your home screen and sign in."))));
    else box.append(h("ol", "ios-steps", h("li", null, h("span", null, "Open your browser's menu (the three dots).")), h("li", null, h("span", null, "Choose ", h("b", null, "Install app"), " or ", h("b", null, "Add to Home screen"), "."))),
      h("p", "note", "On Android this works best in Chrome. If you opened the link inside another app, open it in Chrome first."));
  }, {label: "Add to home screen"});
}
const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const pushHint = () => !pushSupported() ? (isIOS ? "On iPhone, add the app to your home screen first." : "This browser doesn't support notifications.") : Notification.permission === "denied" ? "Blocked in your browser settings." : "Know the moment someone wants to meet you.";
async function currentSub() { if (!pushSupported()) return null; try { const reg = await navigator.serviceWorker.getRegistration(); return reg ? await reg.pushManager.getSubscription() : null; } catch { return null; } }
async function pushState() { const sub = await currentSub(); S.pushOn = !!sub && Notification.permission === "granted"; return S.pushOn; }
async function enablePush() {
  if (!pushSupported()) { if (isIOS && !standalone()) return install(); return toast("This browser doesn't support notifications.", {warn: true}); }
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return toast("Notifications are blocked. You can allow them in your browser's site settings.", {warn: true, ms: 6000});
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: b64ToU8(S.cfg.vapid)});
    await authed("push_sub", {sub: sub.toJSON(), test: true});
    S.pushOn = true; toast("Notifications are on", {icon: "bell"}); await doSync();
  } catch (e) { toast("Notifications could not be switched on. " + (e.message || ""), {warn: true, ms: 6000}); }
}
async function disablePush() {
  const sub = await currentSub();
  try { if (sub) { await authed("push_unsub", {endpoint: sub.endpoint}); await sub.unsubscribe(); } S.pushOn = false; toast("Notifications are off for this device"); refresh(); } catch (e) { toast(e.message, {warn: true}); }
}

boot();
})(window.V2);
