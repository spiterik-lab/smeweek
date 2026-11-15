/* SME Constellation 2.0 – the way in: opening story, sign-in, and the profile steps. */
(function (V) {
"use strict";
const {h, I, api, store, toast, sheet, Stars, first, buzz, reduceMotion} = V;
const root = () => document.getElementById("root");
const S = V.S = {cfg: null, me: null, sync: null, people: [], peopleV: -1, color: {}, sectors: []};

function show(node) { root().replaceChildren(node); scrollTo(0, 0); }
const span = html => { const s = document.createElement("span"); s.innerHTML = html; return s; }; // only ever used with fixed text written in this file

// =====================================================================
// 1. Opening story (skippable, one idea per screen)
// =====================================================================
function story(done) {
  let i = 0, lit = false, stars;
  const el = h("div", {id: "story", "data-mood": "calm", "data-photo": "0"});
  const xp = h("b", null, "0");
  const scenes = [
    {mood: "calm", photo: 0, kids: () => [
      h("p", "eyebrow", S.cfg.eventName + " · 24 November"),
      h("h1", "big", span("Every business starts as a single <em>spark.</em>")),
      h("p", "lead", "Hold the star to light yours."), hold()]},
    {mood: "open", photo: 0, kids: () => [
      h("p", "eyebrow", "People are ready"),
      h("div", "stat", "46.5", h("sup", null, "%")),
      h("p", "lead", "of people in Malta already use generative AI. The third-highest share in the EU."),
      h("p", "src", "Source: Malta Employers conference brief, 2026")]},
    {mood: "alarm", photo: 0, kids: () => [
      h("p", "eyebrow", "Businesses are slower to follow"),
      h("div", "stat", "80.2", h("sup", null, "%")),
      h("p", "lead", "Each hour worked in Malta produces 80.2% of the EU average. AI is one of the tools that can raise it."),
      h("p", "src", "Source: Eurostat 2026, in the conference brief")]},
    {mood: "dark", photo: 0, kids: () => [
      h("p", "eyebrow", "The question we hear most"),
      h("h1", "big", span("Where do I <em>start?</em>")),
      h("p", "lead", "Which tools. What funding. Which rules. Who to ask.")]},
    {mood: "reveal", photo: 1, kids: () => [
      h("p", "eyebrow", "The good news"),
      h("h1", "big", span("The people who can help are <em>in this room.</em>")),
      h("p", "lead", "Funders, regulators, trainers, tech providers, and businesses already doing it.")]},
    {mood: "reveal", photo: 2, kids: () => [
      h("p", "eyebrow", "SME Constellation"),
      h("h1", "big", span("Find <em>your</em> people.")),
      h("div", "steps3",
        h("div", null, h("b", null, "01"), "Say what you can offer and what you need"),
        h("div", null, h("b", null, "02"), "See who you should meet, and why"),
        h("div", null, h("b", null, "03"), "Ask to meet, match, and swap details"))]}
  ];
  function hold() {
    const b = h("button", {class: "hold-btn", type: "button", "aria-label": "Hold to light your star"}, I("star"));
    let t0 = 0, raf = 0;
    const stop = () => { cancelAnimationFrame(raf); b.classList.remove("down"); if (!lit) b.style.setProperty("--p", 0); };
    const run = t => { const p = Math.min(100, (t - t0) / 9); b.style.setProperty("--p", p);
      if (p >= 100) { light(); return; } raf = requestAnimationFrame(run); };
    b.addEventListener("pointerdown", e => { if (lit) return; e.preventDefault(); b.classList.add("down"); t0 = performance.now(); raf = requestAnimationFrame(run); });
    for (const ev of ["pointerup", "pointerleave", "pointercancel"]) b.addEventListener(ev, stop);
    b.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && !lit) { e.preventDefault(); light(); } });
    b.addEventListener("contextmenu", e => e.preventDefault());
    return h("div", "hold", b, h("span", null, "Press and hold"));
  }
  function light() {
    if (lit) return; lit = true; buzz(30); xp.textContent = "20";
    const r = el.querySelector(".hold-btn").getBoundingClientRect(); stars.burst(r.left + r.width / 2, r.top + r.height / 2, 60);
    setTimeout(() => go(1), reduceMotion() ? 0 : 700);
  }
  const prog = h("div", "story-prog", scenes.map(() => h("i", null, h("b"))));
  const sceneEls = scenes.map(s => h("section", "scene", s.kids()));
  const next = h("button", {class: "btn primary", type: "button", onclick: () => go(1)}, "Continue");
  const cv = h("canvas", {"aria-hidden": "true"});
  el.append(h("div", "bg"), h("div", "photo"), cv,
    h("div", "story-top", prog, h("div", "story-hud",
      h("img", {src: "assets/img/brand-logos.png", alt: "Malta Employers · SME Week Malta 2026"}),
      h("div", "row nowrap", h("span", "xp-hud", "XP ", xp), h("button", {class: "story-skip", type: "button", onclick: () => finish(false)}, "Skip")))),
    h("div", {class: "story-nav", "aria-hidden": "true"},
      h("button", {type: "button", tabindex: "-1", onclick: () => go(-1)}), h("button", {type: "button", tabindex: "-1", onclick: () => go(1)})),
    ...sceneEls,
    h("div", "story-dock", h("div", "dockbar", h("img", {src: "assets/img/icon-192.png", alt: ""}), next)));
  function paint() {
    const s = scenes[i]; el.dataset.mood = s.mood; el.dataset.photo = s.photo;
    sceneEls.forEach((e, k) => { e.classList.toggle("on", k === i); e.setAttribute("aria-hidden", k === i ? "false" : "true"); });
    [...prog.children].forEach((e, k) => e.classList.toggle("done", k <= i));
    next.textContent = i === scenes.length - 1 ? "Get started" : i === 0 && !lit ? "Continue without holding" : "Continue";
    stars.connect(i >= 4 ? 1 : i === 3 ? .25 : 0);
  }
  function go(d) {
    if (i + d < 0) return;
    if (i + d >= scenes.length) return finish(true);
    i += d; if (i > 0) xp.textContent = "20"; paint();
  }
  function finish(watched) {
    store.set("intro", {seen: true, watched: watched || !!(store.get("intro") || {}).watched});
    removeEventListener("keydown", keys); stars.stop(); done();
  }
  const keys = e => { if (e.key === "ArrowRight") go(1); else if (e.key === "ArrowLeft") go(-1); };
  addEventListener("keydown", keys);
  show(el); stars = Stars(cv); requestAnimationFrame(paint);
}

// =====================================================================
// 2. Sign in / create account
// =====================================================================
const G_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.500-.200-2.200H12v4.200h5.900a5 5 0 0 1-2.200 3.300v2.700h3.500c2.100-1.900 3.300-4.700 3.300-8z"/><path fill="#34A853" d="M12 23c3 0 5.500-1 7.300-2.700l-3.500-2.700c-1 .7-2.300 1.100-3.800 1.100-2.900 0-5.400-2-6.300-4.600H2v2.800A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.700 14.100a6.600 6.600 0 0 1 0-4.200V7.100H2a11 11 0 0 0 0 9.800z"/><path fill="#EA4335" d="M12 5.400c1.600 0 3.100.6 4.200 1.600l3.100-3.100A11 11 0 0 0 2 7.100l3.700 2.800C6.600 7.300 9.100 5.400 12 5.400z"/></svg>';
const M_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#F25022" d="M2 2h9.500v9.500H2z"/><path fill="#7FBA00" d="M12.500 2H22v9.500h-9.500z"/><path fill="#00A4EF" d="M2 12.500h9.500V22H2z"/><path fill="#FFB900" d="M12.500 12.500H22V22h-9.500z"/></svg>';

function field(label, input, opt) { return h("label", "field", h("span", "lbl", label, opt ? h("span", "opt", " " + opt) : null), input); }
function pwField(label, auto) {
  const inp = h("input", {type: "password", autocomplete: auto, minlength: "8", maxlength: "200", required: true});
  const t = h("button", {type: "button", onclick: () => { const s = inp.type === "password"; inp.type = s ? "text" : "password"; t.textContent = s ? "Hide" : "Show"; }}, "Show");
  return {inp, el: h("div", "field", h("span", "lbl", label), h("div", "pw", inp, t))};
}
/** Runs fn while the button shows it is busy; errors land in the note. */
async function busy(btn, note, fn) {
  const label = btn.textContent; btn.disabled = true; btn.textContent = "One moment…"; if (note) { note.textContent = ""; note.className = "note"; }
  try { await fn(); } catch (e) { if (note) { note.textContent = e.message; note.className = "note warn"; } else toast(e.message, {warn: true}); }
  finally { btn.disabled = false; btn.textContent = label; }
}

function auth(o = {}) {
  let mode = o.reset ? "reset" : (o.mode || "create");
  const email = h("input", {type: "email", autocomplete: "username", inputmode: "email", maxlength: "120", placeholder: "name@company.com", required: true, value: o.email || ""});
  const note = h("p", {class: "note", role: "alert"});
  const form = h("form", {class: "stack", novalidate: true});
  const seg = h("div", {class: "seg", role: "tablist", "data-i": "0"},
    h("button", {type: "button", role: "tab", onclick: () => set("create")}, "Create account"),
    h("button", {type: "button", role: "tab", onclick: () => set("signin")}, "Sign in"));
  const card = h("div", "card lift stack");
  function set(m) { mode = m; paint(); }
  function paint() {
    note.textContent = "";
    seg.dataset.i = mode === "signin" ? "1" : "0";
    [...seg.children].forEach((b, k) => b.setAttribute("aria-selected", String((mode === "signin") === (k === 1))));
    const pw = pwField(mode === "reset" ? "Choose a new password" : "Password", mode === "signin" ? "current-password" : "new-password");
    const submit = h("button", {class: "btn primary block", type: "submit"}, mode === "create" ? "Create my account" : mode === "signin" ? "Sign in" : "Save new password");
    form.replaceChildren();
    if (mode !== "reset") form.append(field("Email", email));
    form.append(pw.el);
    if (mode === "create") form.append(h("p", "note", "At least 8 characters. Your email is only used to sign you in and is never shown to other attendees."));
    form.append(note, submit);
    if (mode === "signin") form.append(h("button", {class: "linkbtn small", type: "button", style: {"align-self": "center"}, onclick: forgot}, "Forgot your password?"));
    form.onsubmit = e => {
      e.preventDefault();
      busy(submit, note, async () => {
        const body = mode === "reset" ? {u: o.reset.u, reset: o.reset.t, password: pw.inp.value} : {email: email.value.trim(), password: pw.inp.value};
        if (mode !== "reset" && !email.value.trim()) throw new Error("Enter your email address.");
        const r = await api(mode === "create" ? "register" : mode === "signin" ? "login" : "reset", body);
        if (mode === "reset") history.replaceState(null, "", location.pathname);
        await V.enter(r);
      });
    };
    card.replaceChildren();
    if (mode === "reset") card.append(h("h2", "h2", "Choose a new password")); else card.append(seg);
    card.append(form);
    const prov = S.cfg.signin || {};
    if (mode !== "reset" && (prov.google || prov.microsoft)) {
      card.append(h("div", "or", "or"));
      for (const [k, name, icon] of [["google", "Google", G_ICON], ["microsoft", "Microsoft", M_ICON]]) if (prov[k]) {
        const b = h("button", {class: "btn provider block", type: "button"}); b.innerHTML = icon; b.append("Continue with " + name);
        b.onclick = () => busy(b, note, async () => { const r = await api("oauth_start", {provider: k}); store.set("oauth", {provider: k, nonce: r.nonce, at: Date.now()}); location.href = r.url; });
        card.append(b);
      }
    }
  }
  function forgot() {
    sheet((box, ctl) => {
      const em = h("input", {type: "email", autocomplete: "username", inputmode: "email", value: email.value, placeholder: "name@company.com"});
      const n = h("p", {class: "note", role: "alert"}), b = h("button", {class: "btn primary block", type: "button"}, "Email me a reset link");
      b.onclick = () => busy(b, n, async () => {
        if (!em.value.trim()) throw new Error("Enter your email address.");
        await api("reset_request", {email: em.value.trim()});
        box.replaceChildren(h("h2", "h2", "Check your inbox"), h("p", "dim", "If there's an account for that email, a reset link is on its way. It works for one hour. Check your spam folder too."),
          h("button", {class: "btn block", type: "button", onclick: ctl.close}, "Done"));
      });
      box.append(h("h2", "h2", "Reset your password"), h("p", "dim small", "Enter the email you signed up with and we'll send you a link to choose a new password."), field("Email", em), n, b);
    }, {label: "Reset your password"});
  }
  const before = h("details", "card", h("summary", {class: "h3", style: {cursor: "pointer"}}, S.cfg.intro.title),
    h("div", {class: "stack tight", style: {"margin-top": "12px"}}, S.cfg.intro.text.map(t => h("p", "note", t)),
      h("p", "note", h("a", {href: "privacy.html", target: "_blank", rel: "noopener"}, "Read the full privacy notice"))));
  paint();
  show(h("div", {id: "auth"}, h("div", "hero"),
    h("div", "auth-wrap",
      h("img", {class: "auth-logos", src: "assets/img/brand-logos.png", alt: "Malta Employers · SME Week Malta 2026"}),
      h("div", "auth-title stack tight", h("p", "eyebrow", S.cfg.eventName + " · Tuesday 24 November · Trident Park"),
        h("h1", null, span("Making <b>AI</b> work for SMEs")),
        h("p", "dim", "Meet the people in the room who can help your business move forward with AI.")),
      card, mode === "reset" ? null : before,
      mode === "reset" ? null : h("button", {class: "linkbtn small", type: "button", style: {"align-self": "center"}, onclick: () => story(() => auth({mode}))}, "Replay the opening"))));
}

// =====================================================================
// 3. Profile steps (first time, and "Edit profile" later)
// =====================================================================
function chip(label, on, toggle, cls, dot) {
  const b = h("button", {class: "chip" + (cls ? " " + cls : ""), type: "button", "aria-pressed": String(!!on)}, dot ? h("i", {style: {background: dot}}) : null, label);
  b.onclick = () => { const v = toggle(b.getAttribute("aria-pressed") !== "true"); if (v !== null) b.setAttribute("aria-pressed", String(v)); };
  return b;
}
function wizard(o = {}) {
  const C = S.cfg, p = o.profile || {}, edit = !!o.profile;
  const W = {name: p.name || o.name || "", role: p.role || "", company: p.company || "", speaker: !!p.speaker || (!edit && /[?&](speaker|role=speaker)\b/.test(location.search)),
    sector: p.sector && p.sector !== "Other" ? p.sector : (p.sector || ""), orgtype: p.orgtype || "", stage: p.stage || "",
    interests: new Set(p.interests || []), topics: new Set(p.topics || []), meet: new Set(p.meet || []), work: p.work || "",
    mobile: p.mobile || "", email: p.email || (edit ? "" : (S.account && S.account.email) || ""), linkedin: p.linkedin || "", hide_mobile: !!p.hide_mobile,
    consent: edit, report: !!p.report, marketing: !!p.marketing, board: !("board" in p) || !!p.board};
  const showSpeaker = W.speaker;
  let i = Math.min(o.step || 0, 4), dir = 1;
  const text = (key, attrs) => h("input", Object.assign({type: "text", value: W[key], oninput: e => { W[key] = e.target.value; }}, attrs));
  const check = (key, label) => h("label", "check", h("input", {type: "checkbox", checked: W[key], onchange: e => { W[key] = e.target.checked; }}), h("span", null, label));
  const setOf = (set, key, max) => v => { if (v && max && set.size >= max) { toast("Pick up to " + max + ".", {warn: true}); return null; } v ? set.add(key) : set.delete(key); return v; };
  const head = (eyebrow, big, sub) => [h("p", "eyebrow", eyebrow), h("h1", "big", span(big)), sub ? h("p", "dim", sub) : null];
  const steps = [
    () => [head("Step 1 of 5 · the basics", "First, <em>who are you?</em>", "This is how other attendees will see you."),
      field("Your name", text("name", {autocomplete: "name", maxlength: "60", placeholder: "First and last name"})),
      field("Organisation", text("company", {autocomplete: "organization", maxlength: "80"})),
      field("Role", text("role", {autocomplete: "organization-title", maxlength: "80", placeholder: "e.g. Managing Director"}), "optional"),
      showSpeaker ? check("speaker", "I'm a speaker or panellist at the forum") : null],
    () => [head("Step 2 of 5 · +30 XP", "Tell us about your <em>organisation.</em>", "Three quick taps. They let us match you with the right kind of people, not just the right topics."),
      field("Sector", h("select", {onchange: e => { W.sector = e.target.value; }},
        h("option", {value: ""}, "Choose your sector"), C.sectors.map(([s]) => h("option", {value: s, selected: W.sector === s}, s)))),
      h("div", "group", h("h3", null, "What kind of organisation?"),
        h("div", "chips", C.orgTypes.map(t => { const b = chip(t.label, W.orgtype === t.key, v => { W.orgtype = v ? t.key : ""; for (const x of b.parentNode.children) x.setAttribute("aria-pressed", "false"); return v; }); return b; }))),
      h("div", "group", h("h3", null, "Where are you with AI today?"),
        h("div", "stack tight", C.stages.map(t => { const b = h("button", {class: "opt-card", type: "button", "aria-pressed": String(W.stage === t.key)}, h("span", "dot"), t.label);
          b.onclick = () => { W.stage = W.stage === t.key ? "" : t.key; for (const x of b.parentNode.children) x.setAttribute("aria-pressed", "false"); b.setAttribute("aria-pressed", String(W.stage === t.key)); }; return b; })))],
    () => [head("Step 3 of 5 · the heart of it", "What can you <em>offer,</em> and what do you <em>need?</em>", "We match what you offer with what others need, and the other way round. Pick at least one."),
      h("div", "group", h("h3", null, "I can offer"), h("div", "chips", C.interests.map(t => chip(t.give, W.interests.has(t.key + ":give"), setOf(W.interests, t.key + ":give"))))),
      h("div", "group", h("h3", null, "I'm looking for"), h("div", "chips", C.interests.map(t => chip(t.get, W.interests.has(t.key + ":get"), setOf(W.interests, t.key + ":get"), "cyan")))),
      h("div", "group", h("h3", null, "And"), h("div", "chips", chip(C.networking, W.interests.has("network"), setOf(W.interests, "network"))))],
    () => [head("Step 4 of 5 · +30 XP", "Sharpen your <em>matches.</em>", "Optional, but this is what turns a good match into the right one."),
      h("div", "group", h("h3", null, "Where do you want AI to work for you? ", h("small", null, "up to " + C.maxTopics)),
        h("div", "chips", C.topics.map(t => chip(t.label, W.topics.has(t.key), setOf(W.topics, t.key, C.maxTopics))))),
      h("div", "group", h("h3", null, "Who would you most like to meet?"),
        h("div", "chips", C.meet.map(t => chip(t.label, W.meet.has(t.key), setOf(W.meet, t.key), "cyan")))),
      field("One thing you're working on or stuck on", text("work", {maxlength: "200", placeholder: "e.g. Automating our quotes and invoices"}), "optional, +20 XP")],
    () => [head("Step 5 of 5 · +30 XP", "Your contact <em>card.</em>", "Private. Nobody sees it until you both agree to match, and you choose what to share with each person."),
      h("div", "two", field("Mobile", text("mobile", {type: "tel", autocomplete: "tel", inputmode: "tel", maxlength: "20", placeholder: "e.g. 9912 3456"}), "optional"),
        field("Email", text("email", {type: "email", autocomplete: "email", inputmode: "email", maxlength: "120", placeholder: "name@company.com"}), "optional")),
      field("LinkedIn or website", text("linkedin", {type: "url", inputmode: "url", maxlength: "200", placeholder: "linkedin.com/in/yourname"}), "optional"),
      h("div", "card stack", check("consent", C.consent), check("report", C.reportConsent), check("marketing", C.marketingConsent),
        h("p", "note", C.consentFootnote + " " + C.retention + " ", h("a", {href: "privacy.html", target: "_blank", rel: "noopener"}, "Privacy notice")))]
  ];
  const problem = k => k === 0 ? (!W.name.trim() || !W.company.trim() ? "Add your name and organisation." : "")
    : k === 2 ? (!W.interests.size ? "Pick at least one thing you can offer or are looking for." : "")
    : k === 4 ? (!W.consent ? "Tick the first box so other attendees can see your profile." : "") : "";
  const bar = h("div", "wz-steps", steps.map(() => h("i")));
  const body = h("div", "wz-body"), foot = h("div", "in"), note = h("p", {class: "note warn", role: "alert", style: {"text-align": "center"}});
  async function save(btn) {
    for (let k = 0; k < 5; k++) { const m = problem(k); if (m) { if (k !== i) { dir = k > i ? 1 : -1; i = k; paint(); } note.textContent = m; return; } }
    await busy(btn, note, async () => {
      const body = Object.assign({}, W, {sector: W.sector || "Other", interests: [...W.interests], topics: [...W.topics], meet: [...W.meet]});
      await V.authed("profile", body);
      await o.onDone();
    });
  }
  function paint() {
    note.textContent = "";
    [...bar.children].forEach((e, k) => e.classList.toggle("done", k <= i));
    body.replaceChildren(h("div", "wz-step" + (dir < 0 ? " back" : ""), steps[i]()), note);
    const last = i === 4;
    const nextB = h("button", {class: "btn " + (edit && !last ? "" : "primary"), type: "button"}, last ? (edit ? "Save changes" : "Put me on the map") : "Continue");
    nextB.onclick = () => { if (last) return save(nextB); const m = problem(i); if (m) { note.textContent = m; return; } dir = 1; i++; paint(); scrollTo(0, 0); };
    const saveB = edit && !last ? h("button", {class: "btn primary", type: "button"}, "Save") : null;
    if (saveB) saveB.onclick = () => save(saveB);
    foot.replaceChildren(...[i > 0 ? h("button", {class: "iconbtn", type: "button", "aria-label": "Back", onclick: () => { dir = -1; i--; paint(); scrollTo(0, 0); }}, I("left")) : null, nextB, saveB].filter(Boolean));
  }
  body.addEventListener("click", () => { note.textContent = ""; });
  paint();
  show(h("div", {id: "wizard"},
    h("div", "wz-top", h("div", "in", bar, edit ? h("button", {class: "iconbtn", type: "button", "aria-label": "Close without saving", onclick: o.onCancel}, I("x")) : h("span", "xp-hud", "XP ", h("b", null, String(Math.max((S.sync && S.sync.game.xp) || 0, (store.get("intro") || {}).watched ? 20 : 0)))))),
    body, h("div", "wz-foot", foot)));
}

/** "You're on the map" moment after the first save. */
function reveal(o) {
  const cv = h("canvas", {"aria-hidden": "true"});
  const el = h("div", "reveal", cv, h("div", "in",
    h("div", {class: "avatar", style: {"--s": "96px", "--c": o.color}}, V.initials(o.name)),
    h("p", "eyebrow", "You're on the map"),
    h("h1", {class: "serif", style: {"font-size": "clamp(42px,12vw,64px)"}}, span("Welcome, <em>" + "</em>")),
    h("p", "dim", o.matches ? `${o.matches} ${o.matches === 1 ? "person" : "people"} in the room already ${o.matches === 1 ? "matches" : "match"} what you're looking for.` : "You're among the first in. Your matches appear as the room fills up."),
    h("span", "xpchip", "+" + o.xp + " XP · LEVEL: " + o.level.toUpperCase()),
    h("button", {class: "btn primary", type: "button", onclick: () => { st.stop(); el.remove(); o.done(); }}, "See my matches")));
  el.querySelector("h1 em").textContent = first(o.name) + ".";
  document.body.append(el);
  const st = Stars(cv); st.connect(1); setTimeout(() => st.burst(undefined, innerHeight * .34, 90), 250); buzz([20, 40, 20]);
}

V.flow = {story, auth, wizard, reveal, busy, field, pwField, chip, show, span};
})(window.V2);
