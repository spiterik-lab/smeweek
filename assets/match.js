/* SME Constellation: the matching rules, shared by the attendee app and the big-screen map.
   The scoring is rule-based, so each match can be explained in a sentence. AI is used for one thing only: reading
   text people typed and placing it in the same tick-box options (see "Typed text" below).
   A person's score for someone else adds up:
     3.5  they offer something I'm looking for          (per topic)
     3.0  they're looking for something I offer         (per topic)
     2.0  they're the kind of person I said I want to meet (first fit; +0.5 for each further fit)
     1.0  I'm the kind of person THEY want to meet
     0.75 each focus area we share (up to 3)
     1.5  I'm early with AI, they're further on and willing to share (1.0 the other way round, 0.5 same stage)
     1.0  we're both here to network
     0.5  we're looking for the same thing (compare notes)   0.4 same sector
     2.0  I'm looking for collaborators and they are too, or they are open to partner on an AI project
     1.0  I'm looking for clients and they need something I offer
     1.0  I'm looking for contacts and so are they (or they are here to network)
     0.5  they're a speaker (only if something else already matched)
   Typed text: when someone writes about their work or types their own sector, AI reads it once and suggests which of
   the tick-box options above it fits (p.hint, made on the server). Those suggestions count here at a lower weight
   and are always worded as coming from the description:
     2.0  what they wrote suggests they offer something I ticked as looking for (or what I wrote fits something they offer)
     1.5  what they wrote suggests they need something I ticked as offering (or the other way round)
     A typed sector that AI places in a listed sector is compared as that sector. Suggested focus areas count as shared ones.
   Ranking uses my score plus half of theirs, so matches that work for both people come first. */
(function (g) {
"use strict";
const BIZ = {micro:1, small:1, medium:1, large:1, solo:1};
const EARLY = {"new":1, explore:1}, AHEAD = {use:1, core:1, guide:1};
const list = a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
const low = s => /^[A-Z][A-Z]/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1);

/** A person's sector for comparing: the listed one, or the one they typed under "Other". */
const hint = p => p.hint || {};
const sec = p => p.sector && p.sector !== "Other" ? p.sector : (hint(p).sector || (p.sector_other ? "other:" + p.sector_other.trim().toLowerCase() : ""));
const secName = p => p.sector && p.sector !== "Other" ? p.sector : (p.sector_other || "");
const secOf = p => p.sector && p.sector !== "Other" ? p.sector : (hint(p).sector || "");
/** Is b the kind of person a asked to meet (one of the MEET keys in event.php)? */
function fits(key, a, b) {
  const gives = k => (b.interests || []).includes(k + ":give");
  switch (key) {
    case "owners":     return !!{micro:1, small:1, medium:1, solo:1}[b.orgtype];
    case "ahead":      return !!BIZ[b.orgtype] && (b.stage === "use" || b.stage === "core");
    case "funders":    return b.orgtype === "agency" || gives("support");
    case "regulators": return b.orgtype === "public" || secOf(b) === "Government & regulators";
    case "providers":  return gives("solution") || secOf(b) === "Tech, software & IT";
    case "trainers":   return gives("training") || secOf(b) === "Education, training & research";
    case "peers":      return !!sec(a) && sec(a) === sec(b);
    case "speakers":   return !!b.speaker;
  }
  return false;
}
const MEET_WHY = {
  owners: "A business leader, the kind of person you want to meet", ahead: "A business further ahead with AI, as you asked",
  funders: "A funder or support agency, as you asked", regulators: "A regulator or policymaker, as you asked",
  providers: "An AI or tech provider, as you asked", trainers: "A trainer or educator, as you asked",
  peers: "In your sector, as you asked", speakers: "One of today's speakers, as you asked"
};

/** How good a match b is for a. Returns {s: score, reasons: [{w, text, kind}], why: [text]} with the strongest reason first. */
function score(a, b, cfg) {
  const A = new Set(a.interests || []), B = new Set(b.interests || []);
  const R = []; let s = 0;
  const hs = p => ({give: hint(p).give || [], get: hint(p).get || [], topics: hint(p).topics || []});
  const ha = hs(a), hb = hs(b);
  const add = (w, text, kind) => { s += w; R.push({w, text, kind}); };
  const bothGet = [];
  for (const it of cfg.interests) {
    if (it.getOnly) continue;
    if (A.has(it.key + ":get") && B.has(it.key + ":give")) add(3.5, `Offers ${it.noun}, which you're looking for`, "get");
    if (A.has(it.key + ":give") && B.has(it.key + ":get")) add(3, `Looking for ${it.noun}, which you offer`, "give");
    if (A.has(it.key + ":get") && B.has(it.key + ":get")) bothGet.push(it.noun);
    // Typed text, read by AI into the same options (never both sides from typed text alone).
    if (A.has(it.key + ":get") && !B.has(it.key + ":give") && hb.give.includes(it.key)) add(2, `Their description suggests they can help with ${it.noun}, which you're looking for`, "get");
    else if (ha.get.includes(it.key) && B.has(it.key + ":give")) add(2, `Offers ${it.noun}, which fits what you wrote about your work`, "get");
    if (A.has(it.key + ":give") && !B.has(it.key + ":get") && hb.get.includes(it.key)) add(1.5, `Their description suggests they need ${it.noun}, which you offer`, "give");
    else if (ha.give.includes(it.key) && B.has(it.key + ":get")) add(1.5, `Looking for ${it.noun}, which fits what you wrote about your work`, "give");
  }
  // The three "looking for" only choices: collaborators, clients, contacts.
  if (A.has("collab:get")) {
    if (B.has("pilot:give")) add(2, "Open to partnering on an AI project, and you're looking for collaborators", "get");
    else if (B.has("collab:get")) add(2, "Also looking for collaborators", "meet");
  }
  if (A.has("clients:get") && R.some(r => r.kind === "give")) add(1, "Could be a client: they need what you offer", "give");
  if (A.has("contacts:get") && (B.has("contacts:get") || B.has("network")) && !(A.has("network") && B.has("network"))) add(1, "Here to make new contacts, like you", "net");
  let first = true;
  for (const k of a.meet || []) if (fits(k, a, b)) { add(first ? 2 : .5, MEET_WHY[k] || "Someone you wanted to meet", "meet"); first = false; }
  if ((b.meet || []).some(k => fits(k, b, a))) add(1, "You're the kind of person they want to meet", "meet");
  const tl = Object.fromEntries((cfg.topics || []).map(t => [t.key, t.label]));
  const tb = (b.topics || []).concat(hb.topics);
  const shared = [...new Set((a.topics || []).concat(ha.topics))].filter(t => tb.includes(t));
  if (shared.length) add(Math.min(shared.length, 3) * .75, `You both want AI for ${list(shared.slice(0, 3).map(t => low(tl[t] || t)))}`, "topic");
  if (a.stage && b.stage) {
    const shares = B.has("knowhow:give") || B.has("practice:give") || b.stage === "guide";
    if (EARLY[a.stage] && AHEAD[b.stage] && shares) add(1.5, "Further along with AI and willing to share", "stage");
    else if (AHEAD[a.stage] && EARLY[b.stage] && (A.has("knowhow:give") || A.has("practice:give"))) add(1, "Starting out with AI, where your experience helps", "stage");
    else if (a.stage === b.stage) add(.5, "At the same stage with AI as you", "stage");
  }
  if (A.has("network") && B.has("network")) add(1, "Here to network, like you", "net");
  if (bothGet.length) add(.5, `Also looking for ${list(bothGet.slice(0, 2))}, so you can compare notes`, "peer");
  if (sec(a) && sec(a) === sec(b) && !(a.meet || []).includes("peers")) add(.4, `Also in ${low(sec(a).startsWith("other:") ? secName(a) : sec(a))}`, "peer");
  if (s > 0 && b.speaker) s += .5;
  R.sort((x, y) => y.w - x.w);
  return {s, reasons: R, why: R.map(r => r.text)};
}
/** Score as a friendly percentage (35 to 98). */
const fit = s => Math.max(35, Math.min(98, Math.round(100 * (1 - Math.exp(-s / 5.5)))));
/** The best people for `me` to meet, strongest first. */
function rank(me, people, cfg) {
  const out = [];
  for (const p of people) {
    if (p.id === me.id) continue;
    const r = score(me, p, cfg), back = score(p, me, cfg);
    if (r.s <= 0) continue;
    out.push({p, s: r.s, total: r.s + back.s * .5, fit: fit(r.s + back.s * .25), reasons: r.reasons});
  }
  return out.sort((x, y) => y.total - x.total || x.p.name.localeCompare(y.p.name));
}
g.SMEMatch = {score, fit, rank, fits, list, secName};
})(typeof window !== "undefined" ? window : globalThis);
