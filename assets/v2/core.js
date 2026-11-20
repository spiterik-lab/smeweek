/* SME Constellation 2.0 – small shared toolkit for the attendee app:
   DOM helper, icons, storage, server calls, sheets, toasts, the star canvases and the people map. */
(function (g) {
"use strict";

// ---------- DOM ----------
function add(parent, kids) {
  for (const k of kids) {
    if (k == null || k === false) continue;
    if (Array.isArray(k)) add(parent, k); else parent.append(k.nodeType ? k : document.createTextNode(String(k)));
  }
  return parent;
}
/** h("div", "class") or h("button", {class, onclick, "aria-label", style:{"--p":40}}, ...children) */
function h(tag, a, ...kids) {
  const e = document.createElement(tag);
  if (typeof a === "string") e.className = a;
  else if (a) for (const k in a) {
    const v = a[k];
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "text") e.textContent = v;
    else if (k === "style") for (const s in v) e.style.setProperty(s, v[s]);
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (["value", "checked", "disabled", "hidden", "selected", "htmlFor", "href", "src", "placeholder"].includes(k)) e[k] = v;
    else e.setAttribute(k, v === true ? "" : v);
  }
  return add(e, kids);
}
const $ = id => document.getElementById(id);

// ---------- icons (24px, stroke) ----------
const P = {
  star: '<path d="M12 2.6l2.7 6.2 6.7.6-5.1 4.4 1.6 6.6L12 16.9l-5.9 3.5 1.6-6.6-5.1-4.4 6.7-.6z"/>',
  spark: '<path d="M12 2v6M12 16v6M2 12h6M16 12h6M5.2 5.2l3.3 3.3M15.5 15.5l3.3 3.3M18.8 5.2l-3.3 3.3M8.5 15.5l-3.3 3.3"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5"/><path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18.5 14.9c1.6.9 2.7 2.6 3 5.1"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  live: '<circle cx="12" cy="12" r="2.2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2"/>',
  check: '<path d="M4.5 12.5l5 5 10-11"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  left: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  send: '<path d="M21 3L10.5 13.5M21 3l-6.5 18-4-7.5L3 9.500z"/>',
  phone: '<path d="M5 3.500h4l2 5-2.500 1.500a11 11 0 0 0 5.500 5.500l1.500-2.500 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5.500a2 2 0 0 1 2-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3.500 7.500l8.500 6 8.500-6"/>',
  link: '<path d="M10 14a4.500 4.500 0 0 0 6.400 0l3-3a4.500 4.500 0 0 0-6.400-6.400l-1 1"/><path d="M14 10a4.500 4.500 0 0 0-6.400 0l-3 3a4.500 4.500 0 0 0 6.400 6.400l1-1"/>',
  download: '<path d="M12 3.500v12M7 11l5 5 5-5M4.500 20.500h15"/>',
  shield: '<path d="M12 2.800l7.500 3v6c0 4.600-3.200 8-7.500 9.400-4.300-1.400-7.500-4.800-7.500-9.400v-6z"/><path d="M9 12l2.200 2.200L15.200 10"/>',
  logout: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10"/>',
  trash: '<path d="M4 6.500h16M9 6.500V4h6v2.500M6.500 6.500l1 13.500h9l1-13.500"/>',
  search: '<circle cx="11" cy="11" r="6.500"/><path d="M16 16l4.500 4.500"/>',
  chat: '<path d="M20.500 11.500a8.200 8.200 0 0 1-12 7.300L3.500 20.500l1.700-4.800A8.300 8.300 0 1 1 20.500 11.500z"/>',
  lock: '<rect x="4.500" y="10.500" width="15" height="10" rx="2.500"/><path d="M8 10.500V7.500a4 4 0 0 1 8 0v3"/>',
  share: '<path d="M12 15V3.500M7.500 7.500L12 3l4.500 4.500M5 12v7a1.500 1.500 0 0 0 1.500 1.500h11A1.500 1.500 0 0 0 19 19v-7"/>',
  plusbox: '<rect x="3.500" y="3.500" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/>',
  play: '<circle cx="12" cy="12" r="9.500"/><path d="M10 8.300v7.400l6-3.700z"/>',
  doc: '<path d="M6.500 2.500h8l5 5v13a1 1 0 0 1-1 1h-12a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1z"/><path d="M14 2.500v5.500h5.500M8.500 13h7M8.500 17h5"/>',
  up: '<path d="M6 14l6-6 6 6"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.500a3.500 3.500 0 0 0 3.800 4M16 6h3.500a3.500 3.500 0 0 1-3.800 4M12 13v4M8.500 20.500h7M10 17h4v3.500h-4z"/>',
  edit: '<path d="M4 20l1-4.500L16.500 4a2.100 2.100 0 0 1 3 3L8 18.500z"/><path d="M14.500 6l3 3"/>',
  phoneadd: '<rect x="6.500" y="2.500" width="11" height="19" rx="3"/><path d="M12 9v6M9 12h6"/>',
  hand: '<path d="M8 12.500l3.500-3.500a2 2 0 0 1 2.800 0l3.200 3.200M2.500 9.500l4-4 5 2M21.500 9.500l-4-4-3 1.200M6.500 13.500l5 5a1.600 1.600 0 0 0 2.300 0l5.700-5.700"/>',
  eye: '<path d="M2.500 12s3.500-6.500 9.500-6.500 9.500 6.500 9.500 6.500-3.500 6.500-9.500 6.500S2.500 12 2.500 12z"/><circle cx="12" cy="12" r="2.800"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.500M12 7.600v.1"/>'
};
function I(name) {
  const t = document.createElement("template");
  t.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.star}</svg>`;
  return t.content.firstChild;
}

// ---------- storage and the server ----------
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem("smec-" + k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem("smec-" + k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem("smec-" + k); } catch {} }
};
async function api(action, body, query = "") {
  const opt = body ? {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)} : {};
  let res, j;
  try { res = await fetch("api.php?action=" + action + query, opt); j = await res.json(); }
  catch { throw new Error("Can't reach the server. Check your connection and try again."); }
  if (!j.ok) { const e = new Error(j.error || "Something went wrong. Try again."); e.status = res.status; throw e; }
  return j;
}
function device() {
  let d = store.get("device");
  if (!d) { d = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, "0")).join(""); store.set("device", d); }
  return d;
}

// ---------- little helpers ----------
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const initials = n => (String(n || "?").trim().split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join("") || "?").toUpperCase();
const first = n => String(n || "").trim().split(/\s+/)[0] || "";
function ago(ts) {
  const s = Math.max(0, Date.now() / 1000 - ts);
  if (s < 60) return "just now"; if (s < 3600) return Math.floor(s / 60) + " min ago"; if (s < 86400) return Math.floor(s / 3600) + " h ago";
  return Math.floor(s / 86400) + " d ago";
}
const clock = ts => new Date(ts * 1000).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
function b64ToU8(s) {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - s.length % 4) % 4));
  return Uint8Array.from(b, c => c.charCodeAt(0));
}
function download(name, text, type) {
  const a = h("a", {href: URL.createObjectURL(new Blob([text], {type})), download: name}); document.body.append(a); a.click(); a.remove();
}
function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch {} }

// ---------- toasts ----------
function toast(text, o = {}) {
  const t = h(o.onclick ? "button" : "div", {class: "toast" + (o.xp ? " xp" : "") + (o.warn ? " warn" : ""), role: "status"},
    I(o.icon || (o.warn ? "info" : o.xp ? "star" : "check")), h("span", null, text), o.xp ? h("b", null, "+" + o.xp + " XP") : null);
  const out = () => { if (!t.isConnected) return; t.classList.add("out"); setTimeout(() => t.remove(), 300); };
  if (o.onclick) t.addEventListener("click", () => { out(); o.onclick(); });
  const box = $("toasts"); while (box.children.length >= 3) box.firstChild.remove();
  box.append(t);
  setTimeout(out, o.ms || 3600);
}

// ---------- sheets (bottom sheets on phones, dialogs on desktop) ----------
const open = [];
function sheet(build, o = {}) {
  const box = h("div", {class: "sheet" + (o.full ? " full" : ""), role: "dialog", "aria-modal": "true", "aria-label": o.label || "Details"});
  const back = h("div", "sheet-back", box);
  let closed = false;
  const ctl = {
    el: box,
    close() {
      if (closed) return; closed = true;
      const i = open.indexOf(ctl); if (i >= 0) open.splice(i, 1);
      back.classList.add("out"); setTimeout(() => back.remove(), 300);
      if (!open.length) document.documentElement.style.overflow = "";
      o.onClose && o.onClose();
      prev && prev.focus && prev.focus({preventScroll: true});
    }
  };
  const prev = document.activeElement;
  box.append(h("button", {class: "iconbtn close", type: "button", "aria-label": "Close", onclick: ctl.close}, I("x")));
  build(box, ctl);
  back.addEventListener("pointerdown", e => { if (e.target === back) ctl.close(); });
  document.body.append(back); open.push(ctl);
  document.documentElement.style.overflow = "hidden";
  return ctl;
}
addEventListener("keydown", e => { if (e.key === "Escape" && open.length) open[open.length - 1].close(); });
function closeSheets() { for (const s of [...open]) s.close(); }

// ---------- star field (opening story, reveal, celebration) ----------
function Stars(cv, o = {}) {
  const ctx = cv.getContext("2d"), still = reduceMotion();
  let W = 0, H = 0, raf = 0, stars = [], links = [], parts = [], linkGoal = 0, linkNow = 0, dead = false;
  function size() {
    const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
    if (!r.width) return;
    W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    const n = Math.round(Math.min(150, W * H / 5200));
    stars = Array.from({length: n}, (_, i) => ({x: Math.random() * W, y: Math.random() * H, r: Math.random() < .12 ? 1.9 : Math.random() * 1.1 + .3, t: Math.random() * 7, v: .04 + Math.random() * .1}));
    const big = stars.filter(s => s.r > 1.5); links = [];
    for (const a of big) { const near = big.filter(b => b !== a).sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y))[0]; if (near) links.push([a, near]); }
    if (still) draw(0);
  }
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    linkNow += (linkGoal - linkNow) * .03;
    if (linkNow > .01) {
      ctx.lineWidth = 1;
      links.forEach(([a, b], i) => { const k = Math.max(0, Math.min(1, linkNow * links.length - i)); if (!k) return;
        ctx.strokeStyle = `rgba(246,205,187,${.34 * k})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k); ctx.stroke(); });
    }
    for (const s of stars) {
      if (!still) { s.y -= s.v; if (s.y < -4) { s.y = H + 4; s.x = Math.random() * W; } }
      const a = still ? .8 : .55 + .45 * Math.sin(t / 900 + s.t);
      ctx.globalAlpha = a; ctx.fillStyle = s.r > 1.5 ? "#ffe9c9" : "#fff";
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
      if (s.r > 1.5) { const gl = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5); gl.addColorStop(0, "rgba(255,233,201,.5)"); gl.addColorStop(1, "rgba(255,233,201,0)"); ctx.globalAlpha = a; ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 5, 0, 7); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    parts = parts.filter(p => p.life > 0);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vy += .05; p.vx *= .985; p.life -= .012;
      ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function tick(t) { if (dead) return; draw(t); raf = requestAnimationFrame(tick); }
  const ro = new ResizeObserver(size); ro.observe(cv); size();
  if (!still) raf = requestAnimationFrame(tick);
  return {
    connect(v) { linkGoal = v; if (still) { linkNow = v; draw(0); } },
    burst(x = W / 2, y = H / 2, n = 70) {
      if (still) return;
      const cs = ["#ffd98c", "#f6cdbb", "#e8a892", "#3db4dd", "#e3266b", "#fff"];
      for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = 2 + Math.random() * 6; parts.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, r: 1 + Math.random() * 2.6, c: cs[i % cs.length], life: .7 + Math.random() * .5}); }
    },
    stop() { dead = true; cancelAnimationFrame(raf); ro.disconnect(); }
  };
}

// ---------- the people map ("constellation") ----------
function Sky(sky, o) {
  const cv = sky.querySelector("canvas"), ctx = cv.getContext("2d"), still = reduceMotion();
  let W = 0, H = 0, nodes = [], edges = [], raf = 0, heat = 1, meId = null, focus = null;
  const order = o.sectors, color = o.color;
  function resize() { const r = sky.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); if (!r.width) return; W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); kick(); }
  function anchor(sector) { const i = order.indexOf(sector), n = order.length || 1; const a = (i < 0 ? n - 1 : i) / n * Math.PI * 2 - Math.PI / 2, R = Math.min(W, H) * .32; return [W / 2 + Math.cos(a) * R * 1.2, H / 2 - 8 + Math.sin(a) * R]; }
  function set(people, me, links) {
    if (!W) resize();
    meId = me; const old = new Map(nodes.map(n => [n.p.id, n]));
    nodes = people.map(p => { const k = old.get(p.id); if (k) { k.p = p; return k; } const [x, y] = anchor(p.sector);
      return {p, x: x + (Math.random() - .5) * 60, y: y + (Math.random() - .5) * 60, vx: 0, vy: 0, born: performance.now(), tw: Math.random() * 6}; });
    edges = links;
    const lg = sky.querySelector(".legend");
    if (lg) { lg.replaceChildren(); const used = new Set(people.map(p => p.sector));
      for (const s of order.filter(s => used.has(s)).slice(0, 9)) lg.append(h("span", null, h("i", {style: {background: color[s]}}), s)); }
    kick();
  }
  function kick() { heat = 1; if (!raf) raf = requestAnimationFrame(tick); }
  function step() {
    const n = nodes.length; if (!n) return; const lg = sky.querySelector(".legend"), bottom = (lg ? lg.offsetHeight : 0) + 30, k = Math.min(W, H) / (Math.sqrt(n) + 2);
    for (let i = 0; i < n; i++) { const a = nodes[i]; for (let j = i + 1; j < n; j++) { const b = nodes[j]; const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy + .01; if (d2 > k * k * 9) continue; const f = k * k * .06 / d2; a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f; } }
    for (const [i, j, s] of edges) { const a = nodes[i], b = nodes[j]; if (!a || !b) continue; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1; const f = (d - k * 1.1) * .00008 * Math.min(2, s / 3.5) * d; a.vx += dx / d * f; a.vy += dy / d * f; b.vx -= dx / d * f; b.vy -= dy / d * f; }
    for (const a of nodes) { const [ax, ay] = anchor(a.p.sector); a.vx += (ax - a.x) * .004; a.vy += (ay - a.y) * .004; a.vx *= .82; a.vy *= .82; a.x += a.vx * heat; a.y += a.vy * heat; a.x = Math.max(22, Math.min(W - 22, a.x)); a.y = Math.max(20, Math.min(H - bottom, a.y)); }
    heat *= .985;
  }
  function draw(t) {
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = "rgba(244,241,248,.22)";
    for (let i = 0; i < 90; i++) ctx.fillRect((i * 9973 % 1000) / 1000 * W, (i * 6151 % 1000) / 1000 * H, 1, 1);
    const hi = focus || nodes.find(n => n.p.id === meId);
    for (const [i, j, s] of edges) { const a = nodes[i], b = nodes[j]; if (!a || !b) continue; const on = hi && (a === hi || b === hi);
      ctx.strokeStyle = on ? "rgba(232,168,146,.9)" : `rgba(185,181,214,${Math.min(.3, .08 + .03 * s)})`; ctx.lineWidth = on ? 1.5 : 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    const labels = nodes.length <= 24;
    for (const nd of nodes) {
      const p = nd.p, isMe = p.id === meId, age = Math.min(1, (t - nd.born) / 700), tw = still ? 1 : .85 + .15 * Math.sin(t / 700 + nd.tw);
      const r = (isMe ? 7 : p.speaker ? 6.5 : 5) * (.4 + .6 * age), c = color[p.sector] || "#b0acd0";
      ctx.globalAlpha = (p.example ? .5 : 1) * age * .35 * tw; const gr = ctx.createRadialGradient(nd.x, nd.y, 0, nd.x, nd.y, r * 4); gr.addColorStop(0, c); gr.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(nd.x, nd.y, r * 4, 0, 7); ctx.fill();
      ctx.globalAlpha = (p.example ? .6 : 1) * age; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(nd.x, nd.y, r, 0, 7); ctx.fill();
      if (p.speaker && !isMe) { ctx.strokeStyle = "#ffd98c"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(nd.x, nd.y, r + 3, 0, 7); ctx.stroke(); }
      if (isMe) { ctx.strokeStyle = "#e8a892"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(nd.x, nd.y, r + 4, 0, 7); ctx.stroke(); }
      if (labels || isMe || nd === focus) { ctx.globalAlpha = (p.example ? .55 : .95) * age; ctx.fillStyle = isMe ? "#f6cdbb" : "#f4f1f8"; ctx.font = `${isMe ? 600 : 500} 11.5px Montserrat,system-ui,sans-serif`; ctx.textAlign = "center"; ctx.fillText(isMe ? "You" : first(p.name), nd.x, nd.y + r + 14); }
      ctx.globalAlpha = 1;
    }
  }
  function tick(t) { raf = 0; if (!sky.isConnected) return; if (heat > .02) step(); draw(t); if (heat > .02 || !still) raf = requestAnimationFrame(tick); }
  function at(x, y) { let best = null, bd = 26 * 26; for (const n of nodes) { const d = (n.x - x) ** 2 + (n.y - y) ** 2; if (d < bd) { bd = d; best = n; } } return best; }
  cv.addEventListener("click", e => { const r = cv.getBoundingClientRect(), n = at(e.clientX - r.left, e.clientY - r.top); focus = n; kick(); if (n && n.p.id !== meId) o.onPick(n.p); });
  new ResizeObserver(resize).observe(sky);
  return {set, resize};
}

g.V2 = {h, $, I, add, store, api, device, toast, sheet, closeSheets, Stars, Sky, reduceMotion, initials, first, ago, clock, b64ToU8, download, buzz};
})(window);
