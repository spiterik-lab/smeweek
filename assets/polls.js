/* LIVE POLLS add-on for SME Constellation. Loaded by index.html, host.html and polls.html.
   Remove this file (with polls.php and polls.html, and the data-feature="polls" lines) to drop polls,
   or simply set ENABLE_POLLS = false in event.php. */
(() => {
"use strict";
document.addEventListener("smec:ready", () => {
  const S = window.SMEC; if (!S || !S.cfg.polls) return;
  const page = document.body.dataset.page;
  if (page === "attendee") attendee(S);
  else if (page === "host") host(S);
  else if (page === "polls") results(S);
});

// Bars for one poll: [{label, n}] and a total for percentages.
function bars(S, box, poll, big){
  box.replaceChildren();
  const total = poll.voters || 0;
  poll.options.forEach((label, i) => {
    const n = poll.counts[i] || 0, pct = total ? Math.round(n / total * 100) : 0;
    const row = S.el("div", "pbar" + (poll.mine?.includes(i) ? " mine" : ""));
    const top = S.el("div", "pbar-top"); top.append(S.el("span", "pbar-label", label), S.el("span", "pbar-n", `${pct}%` + (big ? ` · ${n}` : "")));
    const track = S.el("div", "pbar-track"); const fill = S.el("div", "pbar-fill"); fill.style.width = pct + "%"; track.append(fill);
    row.append(top, track); box.append(row);
  });
}

// ---------- attendee: Poll tab + "poll is open" banner ----------
function attendee(S){
  const view = S.$("view-poll"), banner = S.$("pollBanner"), badge = S.$("pollBadge");
  let current = null, picked = new Set(), visible = false, timer = 0, lastId = null;
  const tab = document.querySelector('nav.tabs button[data-view="poll"]');
  S.$("pollBannerGo")?.addEventListener("click", () => tab?.click());
  document.addEventListener("smec:view", e => { visible = e.detail === "poll"; if (visible){ banner.hidden = true; render(); } });

  async function load(){
    clearTimeout(timer);
    try{
      const j = await S.api("poll", null, "&device=" + S.device());
      current = j.poll;
      if (current && current.id !== lastId){ picked = new Set(current.mine || []); lastId = current.id; }
      const open = !!current?.open, voted = !!current?.mine?.length;
      badge.hidden = !open; banner.hidden = !open || voted || visible;
      if (visible) render();
    }catch{}
    timer = setTimeout(load, document.hidden ? 15000 : 4000);
  }
  function render(){
    const box = S.$("pollBody"); box.replaceChildren();
    if (!current){ box.append(S.el("p", "note", "No poll right now. When the host opens one, it appears here.")); return; }
    box.append(S.el("p", "eyebrow", current.open ? "Live poll" : "Poll closed · results"));
    box.append(S.el("h2", "section-h", current.question));
    const voted = !!current.mine?.length;
    if (current.open){
      box.append(S.el("p", "note", current.max > 1 ? `Pick up to ${current.max}.` : "Pick one."));
      const opts = S.el("div", "popts");
      current.options.forEach((label, i) => {
        const b = S.el("button", "chip popt", label); b.type = "button"; b.setAttribute("aria-pressed", String(picked.has(i)));
        b.onclick = () => {
          if (picked.has(i)) picked.delete(i);
          else { if (current.max === 1) picked.clear(); else if (picked.size >= current.max) return msg(`Pick up to ${current.max}.`, "warn"); picked.add(i); }
          render();
        };
        opts.append(b);
      });
      box.append(opts);
      const send = S.el("button", "btn primary", voted ? "Change my vote" : "Vote"); send.type = "button";
      send.onclick = async () => {
        if (!picked.size) return msg("Pick an answer first.", "warn");
        send.disabled = true;
        try{ await S.api("pvote", {pid: current.id, choices: [...picked], device: S.device()}); msg("Thanks, your vote is in. Results are on the big screen.", "ok"); await load(); }
        catch(err){ msg(err.message, "warn"); } finally{ send.disabled = false; }
      };
      const m = S.el("span", "note"); m.id = "pollMsg";
      const row = S.el("div", "row"); row.append(send, m); box.append(row);
    }
    if (voted || !current.open){
      const r = S.el("div", "pbars"); bars(S, r, current, false);
      box.append(S.el("h3", "sub", `Results so far · ${current.voters} vote${current.voters === 1 ? "" : "s"}`), r);
    }
  }
  function msg(t, cls){ const m = S.$("pollMsg"); if (m){ m.textContent = t; m.className = "note " + (cls || ""); } }
  load();
}

// ---------- host: open / close polls ----------
function host(S){
  const box = S.$("pollAdmin"); if (!box) return;
  let timer = 0;
  const key = () => S.store.get("hostKey") || "";
  async function call(op, pid){
    clearTimeout(timer);
    try{ const j = await S.api("padmin", {key: key(), op, pid}); draw(j.polls); }
    catch(err){ box.replaceChildren(S.el("p", "note warn", err.message)); }
    timer = setTimeout(() => call("list"), document.hidden ? 15000 : 4000);
  }
  function draw(list){
    box.replaceChildren();
    box.append(S.el("p", "note", "Open a poll when you want the room to vote. Show smeweek.tetra.com.mt/polls.html on the big screen for live results."));
    for (const p of list){
      const card = S.el("div", "q host" + (p.open ? " live" : ""));
      card.append(S.el("div", "votes", String(p.voters)));
      const b = S.el("div", "q-body");
      b.append(S.el("div", "q-text", p.question), S.el("div", "q-meta", (p.open ? "Open now" : p.shown ? "On screen, closed" : "Not shown") + ` · ${p.max > 1 ? "pick up to " + p.max : "pick one"}`));
      if (p.voters){ const r = S.el("div", "pbars"); bars(S, r, p, true); b.append(r); }
      const row = S.el("div", "row");
      const btn = (label, op, cls = "ghost") => { const x = S.el("button", "btn small " + cls, label); x.type = "button"; x.onclick = () => call(op, p.id); row.append(x); };
      if (p.open) btn("Close voting", "close", "primary"); else btn(p.voters ? "Reopen" : "Open poll", "open", "primary");
      if (p.shown) btn("Take off screen", "hide");
      if (p.voters && !p.open) btn("Reset votes", "reset");
      b.append(row); card.append(b); box.append(card);
    }
  }
  // Start once the host page is unlocked (the questions view shows), and stop on Lock.
  const main = S.$("hostMain");
  const watch = () => { if (!main.hidden && key()) call("list"); else clearTimeout(timer); };
  new MutationObserver(watch).observe(main, {attributes: true, attributeFilter: ["hidden"]});
  watch();
}

// ---------- projector: live results ----------
function results(S){
  const joinUrl = new URL("./", location.href).href;
  S.$("pJoin").textContent = joinUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (window.qrcode){ const q = qrcode(0, "M"); q.addData(joinUrl); q.make(); S.$("pQr").innerHTML = q.createSvgTag({cellSize: 6, margin: 0, scalable: true}); }
  let timer = 0;
  async function load(){
    clearTimeout(timer);
    try{
      const j = await S.api("poll");
      const p = j.poll;
      S.$("pIdle").hidden = !!p; S.$("pLive").hidden = !p;
      if (p){
        S.$("pState").textContent = p.open ? "Vote now on your phone" : "Voting closed";
        S.$("pQuestion").textContent = p.question;
        S.$("pCount").textContent = `${p.voters} vote${p.voters === 1 ? "" : "s"}` + (p.max > 1 ? ` · pick up to ${p.max}` : "");
        bars(S, S.$("pBars"), p, true);
      }
    }catch{}
    timer = setTimeout(load, 2500);
  }
  S.$("pFull")?.addEventListener("click", () => document.documentElement.requestFullscreen?.().catch(() => {}));
  load();
}
})();
