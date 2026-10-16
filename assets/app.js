/* SME Constellation – shared logic for the attendee page (index.html), the big screen (screen.html)
   and the host's question view (host.html). Event content (questions, sectors, agenda) comes from event.php. */
(() => {
"use strict";
let CFG = null, COLOR = {}, SECTOR_ORDER = [];

// Fictional example attendees – shown only when switched on, never saved.
// [name, organisation, role, sector, interests, speaker]
const EX_ROWS = [
 ["Maria","Harbour Light Hotels","Operations Manager","Tourism & hospitality",["training:get","solution:get","network"]],
 ["Luke","Bluegate Logistics","CEO","Shipping, logistics & maritime",["solution:get","practice:get"]],
 ["Rebecca","Pixelforge Studios","Head of Product","Gaming & digital",["solution:give","practice:give","network"]],
 ["Daniel","Salina Fintech","CTO","Financial services & banking",["practice:give","knowhow:give"]],
 ["Claire","Seabreeze Aquaculture","Founder","Manufacturing",["support:get","knowhow:get"]],
 ["Mark","Aerotech Components","Plant Manager","Manufacturing",["training:get","practice:get"]],
 ["Sarah","Corner Deli Group","Owner","Retail & trade",["knowhow:get","solution:get","network"]],
 ["Nathan","Grid & Ledger Advisory","Partner","Professional services",["knowhow:give","network"]],
 ["Elena","Cloudbay Systems","Solutions Architect","Tech & IT",["solution:give","training:give"]],
 ["Joseph","Skills Forward Agency","Programme Lead","Public body or support agency",["support:give","training:give"],true],
 ["Anna","Northshore Academy","Director","Education & training",["training:give","knowhow:get"]],
 ["Kurt","Valley Print Works","Managing Director","Retail & trade",["support:get","solution:get"]],
 ["Isabel","Tidewater Yachting","Commercial Manager","Shipping, logistics & maritime",["practice:get","network"]],
 ["Paul","Bright Ledger Accountants","Director","Professional services",["training:get","knowhow:get"]],
 ["Julia","Greenroof Energy","Co-founder","Construction & property",["support:get","network"]],
 ["Matthew","Secure Isle IT","Security Lead","Tech & IT",["knowhow:give","practice:give"]],
 ["Chiara","Care Plus Homes","Operations Director","Health & care",["solution:get","training:get"]],
 ["Ryan","Coastal Villas Collection","Owner","Tourism & hospitality",["support:get","practice:get"]],
 ["Nicole","Harbourline Insurance","HR Manager","Financial services & banking",["training:get","network"]],
 ["Adrian","Workers First Union","Policy Officer","Union or employer association",["knowhow:get","practice:get","network"]],
 ["Sophie","Wordsmith Studio","Founder","Professional services",["solution:give","network"]],
 ["Karl","Venture Isle Fund","Investment Associate","Financial services & banking",["support:give","network"],true]
];
const EX = EX_ROWS.map((r,i)=>({id:"ex"+i,name:r[0],company:r[1],role:r[2],sector:r[3],interests:r[4],speaker:!!r[5],work:"",example:true}));

const $ = id => document.getElementById(id);
const el = (tag, cls, text) => { const e=document.createElement(tag); if(cls) e.className=cls; if(text!=null) e.textContent=text; return e; };
const store = {
  get(k){ try{ return JSON.parse(localStorage.getItem("smec-"+k)); }catch{ return null; } },
  set(k,v){ try{ localStorage.setItem("smec-"+k, JSON.stringify(v)); }catch{} },
  del(k){ try{ localStorage.removeItem("smec-"+k); }catch{} }
};
async function api(action, body, query=""){
  const opt = body ? {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)} : {};
  let res, j;
  try{ res = await fetch("api.php?action="+action+query, opt); j = await res.json(); }
  catch{ throw new Error("Can't reach the server. Check your connection and try again."); }
  if(!j.ok) throw new Error(j.error || "Something went wrong. Try again.");
  return j;
}
function device(){ let d=store.get("device"); if(!d){ d=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,"0")).join(""); store.set("device",d); } return d; }

// ---------- words for interests ----------
function words(ids){
  const out=[];
  for(const id of ids||[]){
    if(id==="network"){ out.push(CFG.networking); continue; }
    const [k,side]=id.split(":"); const it=CFG.interests.find(x=>x.key===k);
    if(it) out.push(side==="give"?it.give:it.get);
  }
  return out;
}

// ---------- matching ----------
function score(a,b){
  let s=0; const why=[]; const A=new Set(a.interests||[]), B=new Set(b.interests||[]);
  const theyOffer=[], weOffer=[], both=[];
  for(const it of CFG.interests){
    if(A.has(it.key+":get") && B.has(it.key+":give")) theyOffer.push(it.noun);
    if(A.has(it.key+":give") && B.has(it.key+":get")) weOffer.push(it.noun);
    if(A.has(it.key+":get") && B.has(it.key+":get")) both.push(it.noun);
  }
  s += theyOffer.length*3 + weOffer.length*3;
  if(theyOffer.length) why.push(`${b.name} offers ${list(theyOffer)}, which you're looking for`);
  if(weOffer.length) why.push(`you can offer them ${list(weOffer)}`);
  if(both.length){ s+=.5; if(!theyOffer.length && !weOffer.length) why.push(`you're both looking for ${list(both)}`); }
  if(A.has("network") && B.has("network")){ s+=1; if(!why.length) why.push("you're both here to network"); }
  if(s>0 && b.speaker) s+=.5;
  return {s,why};
}
const list = a => a.length<2 ? a.join("") : a.slice(0,-1).join(", ")+" and "+a[a.length-1];
function links(people){
  const out=[];
  for(let i=0;i<people.length;i++)for(let j=i+1;j<people.length;j++){const s=Math.max(score(people[i],people[j]).s,score(people[j],people[i]).s); if(s>=3) out.push([i,j,s]);}
  return out;
}

// ---------- the sky map ----------
function Sky(sky, opts={}){
  const cv=sky.querySelector("canvas"), ctx=cv.getContext("2d");
  const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W=0,H=0,nodes=[],edges=[],raf=0,heat=1,hover=null,pop=null,meId=null;
  const labelMax = opts.labelMax ?? 40, big = !!opts.big;
  function resize(){const r=sky.getBoundingClientRect();const d=Math.min(2,devicePixelRatio||1);W=r.width;H=r.height;cv.width=W*d;cv.height=H*d;ctx.setTransform(d,0,0,d,0,0);kick();}
  function anchor(sector){const i=SECTOR_ORDER.indexOf(sector),n=SECTOR_ORDER.length||1;const a=(i<0?n-1:i)/n*Math.PI*2-Math.PI/2,R=Math.min(W,H)*.3;return [W/2+Math.cos(a)*R*1.25,H/2+Math.sin(a)*R];}
  function set(people, me){
    meId=me; const old=new Map(nodes.map(n=>[n.p.id,n]));
    nodes=people.map(p=>{const o=old.get(p.id); if(o){o.p=p;return o;} const [x,y]=anchor(p.sector);
      return {p,x:x+(Math.random()-.5)*60,y:y+(Math.random()-.5)*60,vx:0,vy:0,born:performance.now(),tw:Math.random()*6};});
    edges=links(people);
    const lg=sky.querySelector(".legend"); if(lg){lg.replaceChildren(); const used=new Set(people.map(p=>p.sector));
      for(const s of SECTOR_ORDER.filter(s=>used.has(s))){const d=el("span"),i=el("i");i.style.background=COLOR[s];d.append(i,document.createTextNode(s));lg.append(d);}
      if(people.some(p=>p.speaker)){const d=el("span","spk"),i=el("i");d.append(i,document.createTextNode("Speaker"));lg.append(d);}}
    const em=sky.querySelector(".empty"); if(em) em.hidden=people.length>0;
    kick(); return edges.length;
  }
  function kick(){heat=1; if(!raf) raf=requestAnimationFrame(tick);}
  function step(){const n=nodes.length;if(!n)return;const lg=sky.querySelector(".legend");const bottom=(lg?lg.offsetHeight:0)+34;const k=Math.min(W,H)/(Math.sqrt(n)+2);
    for(let i=0;i<n;i++){const a=nodes[i];for(let j=i+1;j<n;j++){const b=nodes[j];const dx=a.x-b.x,dy=a.y-b.y,d2=dx*dx+dy*dy+.01;if(d2>k*k*9)continue;const f=k*k*.06/d2;a.vx+=dx*f;a.vy+=dy*f;b.vx-=dx*f;b.vy-=dy*f;}}
    for(const [i,j,s] of edges){const a=nodes[i],b=nodes[j];const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;const f=(d-k*1.1)*.00008*(s/3)*d;a.vx+=dx/d*f;a.vy+=dy/d*f;b.vx-=dx/d*f;b.vy-=dy/d*f;}
    for(const a of nodes){const [ax,ay]=anchor(a.p.sector);a.vx+=(ax-a.x)*.004;a.vy+=(ay-a.y)*.004;a.vx*=.82;a.vy*=.82;a.x+=a.vx*heat;a.y+=a.vy*heat;a.x=Math.max(24,Math.min(W-24,a.x));a.y=Math.max(24,Math.min(H-bottom,a.y));}
    heat*=.985;}
  function draw(t){
    ctx.clearRect(0,0,W,H); ctx.fillStyle="rgba(244,241,248,.2)";
    for(let i=0;i<90;i++) ctx.fillRect((i*9973%1000)/1000*W,(i*6151%1000)/1000*H,1,1);
    const hi=hover||nodes.find(n=>n.p.id===meId);
    for(const [i,j,s] of edges){const a=nodes[i],b=nodes[j],on=hi&&(a===hi||b===hi);
      ctx.strokeStyle=on?"rgba(232,168,146,.9)":`rgba(185,181,214,${.12+.06*s/3})`;ctx.lineWidth=on?1.6:1;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    const labels=nodes.length<=labelMax, fs=big?14:12;
    for(const nd of nodes){const p=nd.p,isMe=p.id===meId,age=Math.min(1,(t-nd.born)/700),tw=reduce?1:.85+.15*Math.sin(t/700+nd.tw);
      const r=(isMe?7:p.speaker?(big?8:6.5):big?6:5)*(.4+.6*age),c=COLOR[p.sector]||"#b0acd0";
      ctx.globalAlpha=(p.example?.55:1)*age*.35*tw;const g=ctx.createRadialGradient(nd.x,nd.y,0,nd.x,nd.y,r*4);g.addColorStop(0,c);g.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(nd.x,nd.y,r*4,0,7);ctx.fill();
      ctx.globalAlpha=(p.example?.6:1)*age;ctx.fillStyle=c;ctx.beginPath();ctx.arc(nd.x,nd.y,r,0,7);ctx.fill();
      if(p.speaker&&!isMe){ctx.strokeStyle="rgba(255,255,255,.9)";ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(nd.x,nd.y,r+3,0,7);ctx.stroke();}
      if(isMe){ctx.strokeStyle="#e8a892";ctx.lineWidth=2;ctx.beginPath();ctx.arc(nd.x,nd.y,r+4,0,7);ctx.stroke();}
      if(labels||isMe||nd===hover||p.speaker){ctx.globalAlpha=(p.example?.55:.95)*age;ctx.fillStyle=isMe?"#e8a892":"#f4f1f8";ctx.font=`${isMe||p.speaker?600:500} ${fs}px Montserrat,system-ui,sans-serif`;ctx.textAlign="center";ctx.fillText(isMe?`${p.name} (you)`:p.name,nd.x,nd.y+r+fs+3);}
      ctx.globalAlpha=1;}
  }
  function tick(t){raf=0;if(heat>.02)step();draw(t);if(heat>.02||!reduce)raf=requestAnimationFrame(tick);}
  function at(x,y){let best=null,bd=22*22;for(const n of nodes){const d=(n.x-x)**2+(n.y-y)**2;if(d<bd){bd=d;best=n;}}return best;}
  function showPop(n){ if(pop){pop.remove();pop=null;} if(!n) return;
    pop=el("div","card-pop");
    const b=el("b",null,n.p.name+(n.p.example?"  ·  example":""));
    const m=el("div","meta",[n.p.role,n.p.company].filter(Boolean).join(", "));
    const s=el("div","meta",n.p.sector+(n.p.speaker?" · Speaker":""));
    const tg=el("div","tags"); for(const w of words(n.p.interests)) tg.append(el("span","tag",w));
    pop.append(b,m,s,tg);sky.append(pop);
    pop.style.left=Math.max(8,Math.min(W-pop.offsetWidth-8,n.x+12))+"px";pop.style.top=Math.max(8,Math.min(H-pop.offsetHeight-8,n.y+12))+"px";}
  cv.addEventListener("pointermove",e=>{if(e.pointerType!=="mouse")return;const r=cv.getBoundingClientRect(),n=at(e.clientX-r.left,e.clientY-r.top);if(n!==hover){hover=n;showPop(n);kick();}});
  cv.addEventListener("pointerleave",()=>{hover=null;showPop(null);});
  cv.addEventListener("click",e=>{const r=cv.getBoundingClientRect(),n=at(e.clientX-r.left,e.clientY-r.top);hover=n;showPop(n);kick();});
  new ResizeObserver(resize).observe(sky);
  return {set,resize};
}

// ---------- live data ----------
function feed(onChange, every){
  let v=-1, timer=0;
  async function poll(){
    try{ const j=await api("list",null,"&since="+v); if(!j.unchanged){ v=j.v; onChange(j.people,!!j.ai,j.title); } }
    catch{}
    timer=setTimeout(poll, document.hidden?every*3:every);
  }
  document.addEventListener("visibilitychange",()=>{ if(!document.hidden){ clearTimeout(timer); poll(); } });
  poll();
  return {refresh(){ clearTimeout(timer); v=-1; poll(); }};
}

// ---------- agenda (Malta time) ----------
function maltaNow(){
  const f=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Malta",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false});
  const p=Object.fromEntries(f.formatToParts(new Date()).map(x=>[x.type,x.value]));
  return {date:`${p.year}-${p.month}-${p.day}`, mins:(+p.hour%24)*60+(+p.minute)};
}
const toMins = t => { const [h,m]=t.split(":").map(Number); return h*60+m; };
function currentItem(){
  const n=maltaNow(); if(n.date!==CFG.date) return null;
  return CFG.agenda.find(a=>n.mins>=toMins(a.time) && n.mins<toMins(a.time)+a.mins) || null;
}

// ==========================================================
// ATTENDEE PAGE
// ==========================================================
function attendee(){
  let real=[], ai=false, me=store.get("me"); // me = {id, token, profile}
  let showEx=false, exTouched=false, contacts={incoming:[],swapped:[],sent:[]};
  const pick=new Set();
  const sky=Sky($("sky"));
  const people=()=>{ const l=real.slice(); if(showEx) l.push(...EX); return l; };
  const myProfile=()=> me && real.find(p=>p.id===me.id);
  const VIEWS=[...document.querySelectorAll("nav.tabs button")].map(b=>b.dataset.view);

  function render(){
    const l=people();
    const n=sky.set(l, me?.id);
    $("cPeople").textContent=l.length; $("cLinks").textContent=n; $("cSectors").textContent=new Set(l.map(p=>p.sector)).size;
    if(!$("view-matches").hidden) renderMatches();
  }
  const f=feed((p,a)=>{ real=p; ai=a;
    if(me && !real.some(x=>x.id===me.id)){ me=null; store.del("me"); resetForm(); }
    if(!exTouched){ showEx=real.length<6; $("exToggle").checked=showEx; }
    render(); }, 8000);

  // number swaps
  let cTimer=0;
  async function pollContacts(){
    clearTimeout(cTimer);
    if(me){ try{ contacts=await api("contacts",{id:me.id,token:me.token}); }catch{} }
    const badge=$("matchBadge"); badge.textContent=contacts.incoming.length||""; badge.hidden=!contacts.incoming.length;
    if(!$("view-matches").hidden) renderMatches();
    cTimer=setTimeout(pollContacts, document.hidden?30000:10000);
  }
  pollContacts();

  // tabs
  function show(view){
    if(!VIEWS.includes(view)) view="join";
    for(const b of document.querySelectorAll("nav.tabs button")){ const on=b.dataset.view===view; b.setAttribute("aria-selected",String(on)); if(on) b.scrollIntoView({block:"nearest",inline:"nearest"}); }
    for(const v of VIEWS) $("view-"+v).hidden=v!==view;
    if(view==="map") sky.resize();
    if(view==="matches") renderMatches();
    if(view==="agenda") renderAgenda();
    if(view==="ask") loadQuestions();
    store.set("tab",view);
    document.dispatchEvent(new CustomEvent("smec:view",{detail:view}));
  }
  for(const b of document.querySelectorAll("nav.tabs button")) b.addEventListener("click",()=>show(b.dataset.view));
  $("emptyJoin").addEventListener("click",()=>show("join"));

  // form
  const sel=$("fSector"); sel.append(new Option("Choose a sector (optional)",""));
  for(const s of SECTOR_ORDER) sel.append(new Option(s,s));
  $("consentText").textContent=CFG.consent;
  function chip(id,label,box){ const c=el("button","chip",label); c.type="button"; c.dataset.id=id; c.setAttribute("aria-pressed","false");
    c.addEventListener("click",()=>{ if(pick.has(id)) pick.delete(id); else pick.add(id); c.setAttribute("aria-pressed",String(pick.has(id))); }); box.append(c); }
  for(const it of CFG.interests) chip(it.key+":give",it.give,$("chipsGive"));
  for(const it of CFG.interests) chip(it.key+":get",it.get,$("chipsGet"));
  chip("network",CFG.networking,$("chipsNet"));
  function msg(t,cls){ const m=$("joinMsg"); m.textContent=t; m.className="note "+(cls||""); }
  function syncChips(){ for(const c of document.querySelectorAll("#joinForm .chip")) c.setAttribute("aria-pressed",String(pick.has(c.dataset.id))); }
  function fillForm(p){ $("fName").value=p.name||""; $("fCompany").value=p.company||""; $("fMobile").value=p.mobile||""; $("fRole").value=p.role||"";
    sel.value=p.sector&&p.sector!=="Other"?p.sector:(p.sector||""); $("fWork").value=p.work||""; $("fSpeaker").checked=!!p.speaker;
    $("fConsent").checked=true; pick.clear(); for(const i of p.interests||[]) pick.add(i); syncChips();
    $("btnSave").textContent="Update my details"; $("btnRemoveMe").hidden=false; }
  function resetForm(){ $("joinForm").reset(); pick.clear(); syncChips(); $("btnSave").textContent="Add me to the map"; $("btnRemoveMe").hidden=true; }
  if(me?.profile) fillForm(me.profile);

  $("joinForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const p={name:$("fName").value.trim(),company:$("fCompany").value.trim(),mobile:$("fMobile").value.trim(),role:$("fRole").value.trim(),
             sector:sel.value||"Other",interests:[...pick],speaker:$("fSpeaker").checked,work:$("fWork").value.trim()};
    if(!p.name||!p.company) return msg("Add your name and organisation.","warn");
    if(!p.interests.length) return msg("Tick at least one reason you're attending.","warn");
    if(!$("fConsent").checked) return msg("Tick the consent box so others can see your details.","warn");
    $("btnSave").disabled=true; msg("Saving…");
    try{
      const j=await api("join",{...p,consent:true,id:me?.id||"",token:me?.token||""});
      me={id:j.id,token:j.token,profile:p}; store.set("me",me); fillForm(p);
      msg("You're on the map. Opening your matches…","ok"); f.refresh(); pollContacts();
      setTimeout(()=>show("matches"),900);
    }catch(err){ msg(err.message,"warn"); }
    finally{ $("btnSave").disabled=false; }
  });
  $("btnRemoveMe").addEventListener("click",async()=>{
    if(!me) return;
    try{ await api("remove",{id:me.id,token:me.token}); }catch(err){ return msg(err.message,"warn"); }
    me=null; store.del("me"); resetForm(); contacts={incoming:[],swapped:[],sent:[]}; msg("You've been removed from the map.","ok"); f.refresh(); pollContacts();
  });

  // matches
  const aiCache=new Map();
  async function connect(other, undo=false){
    try{ await api("connect",{id:me.id,token:me.token,other,undo}); await pollContacts(); }
    catch(err){ $("matchIntro").textContent=err.message; }
  }
  function swapControl(otherId, otherHasMobile){
    const box=el("div","swap");
    const swapped=contacts.swapped.find(s=>s.id===otherId);
    if(swapped){
      if(swapped.mobile){ const a=el("a","phone",swapped.mobile); a.href="tel:"+swapped.mobile.replace(/\s/g,""); box.append(el("span","note ok","Numbers swapped: "),a); }
      else box.append(el("span","note","You've agreed to connect. They haven't added a mobile number."));
      return box;
    }
    const incoming=contacts.incoming.some(s=>s.id===otherId), sent=contacts.sent.includes(otherId);
    if(sent){ box.append(el("span","note","Waiting for them to agree. ")); const u=el("button","linkbtn","Cancel"); u.type="button"; u.onclick=()=>connect(otherId,true); box.append(u); return box; }
    const b=el("button","btn ghost small",incoming?"They want to swap numbers. Agree":"Swap mobile numbers"); b.type="button";
    if(!otherHasMobile && !incoming){ b.disabled=true; b.title="They haven't added a mobile number"; b.textContent="No mobile number added"; }
    b.onclick=()=>connect(otherId); box.append(b); return box;
  }
  function renderMatches(){
    const listEl=$("matchList"); listEl.replaceChildren();
    const inc=$("incoming"); inc.replaceChildren(); inc.hidden=true;
    const mine=myProfile() || (me?.profile ? {...me.profile,id:me.id} : null);
    if(!mine){ $("matchTitle").textContent="Your people to meet"; $("matchIntro").textContent="Add yourself first. Your matches appear here straight away.";
      const b=el("button","btn primary","Add yourself"); b.type="button"; b.onclick=()=>show("join"); listEl.append(b); return; }
    const ranked=people().filter(p=>p.id!==mine.id).map(p=>({p,...score(mine,p)})).filter(r=>r.s>0).sort((a,b)=>b.s-a.s).slice(0,3);
    const shown=new Set(ranked.map(r=>r.p.id));
    const extra=contacts.incoming.filter(x=>!shown.has(x.id)).concat(contacts.swapped.filter(x=>!shown.has(x.id)));
    if(extra.length){ inc.hidden=false; inc.append(el("h3","sub","Swap requests and contacts"));
      for(const x of extra){ const row=el("div","inc-row"); row.append(el("span",null,`${x.name}, ${x.company}`), swapControl(x.id, true)); inc.append(row); } }
    $("matchTitle").textContent=`${mine.name}, your ${ranked.length===1?"best match":"people to meet"}`;
    $("matchIntro").textContent=ranked.length?"Matched on what you're looking for and what they offer, and the other way round. Swap numbers only if you both agree.":"No strong matches yet. Check back as more people join.";
    for(const r of ranked){
      const card=el("article","match");
      const who=el("div","who"); const dot=el("span","dot"); dot.style.background=COLOR[r.p.sector]||"#aaa";
      who.append(dot,el("h3",null,r.p.name));
      if(r.p.speaker) who.append(el("span","flag spk","speaker"));
      if(r.p.example) who.append(el("span","flag","example"));
      who.append(el("span","score",`${Math.min(99,Math.round(50+r.s*7))}% fit`));
      const meta=el("div","meta",[r.p.role,r.p.company].filter(Boolean).join(", ")+" · "+r.p.sector);
      const w=r.why.join("; "); const why=el("div","why",w.charAt(0).toUpperCase()+w.slice(1)+".");
      const out=el("div","ai"); out.hidden=true;
      const btn=el("button","btn ghost small","Suggest an opening line"); btn.type="button"; btn.hidden=!ai || r.p.example;
      if(aiCache.has(r.p.id)){ out.hidden=false; out.textContent=aiCache.get(r.p.id); btn.hidden=true; }
      btn.addEventListener("click",async()=>{ btn.disabled=true; out.hidden=false; out.textContent="Thinking…";
        try{ const j=await api("icebreaker",{id:me.id,token:me.token,other:r.p.id}); const t=`“${j.opener}”${j.explore?"\n\n"+j.explore:""}`; out.textContent=t; aiCache.set(r.p.id,t); btn.hidden=true; }
        catch(err){ out.textContent=err.message; } finally{ btn.disabled=false; } });
      card.append(who,meta,why);
      if(!r.p.example) card.append(swapControl(r.p.id, r.p.hasMobile));
      card.append(btn,out); listEl.append(card);
    }
  }
  $("exToggle").addEventListener("change",e=>{ showEx=e.target.checked; exTouched=true; render(); });

  // agenda
  function renderAgenda(){
    const box=$("agendaList"); box.replaceChildren(); const now=currentItem();
    for(const a of CFG.agenda){
      const row=el("div","ag"+(a===now?" now":"")); const t=el("div","ag-time",a.time);
      const body=el("div","ag-body"); body.append(el("div","ag-title",a.title)); if(a.who) body.append(el("div","ag-who",a.who));
      if(a===now) body.prepend(el("span","flag live","on now"));
      row.append(t,body);
      if(a.qa){ const q=el("button","linkbtn","Ask a question"); q.type="button"; q.onclick=()=>{ $("qSession").value=a.qa; show("ask"); }; body.append(q); }
      box.append(row);
    }
  }
  setInterval(()=>{ if(!$("view-agenda").hidden) renderAgenda(); }, 60000);

  // questions
  const qs=$("qSession"); for(const s of CFG.qa) qs.append(new Option(s.label,s.key));
  const cur=currentItem(); if(cur?.qa) qs.value=cur.qa;
  let qTimer=0;
  async function loadQuestions(){
    clearTimeout(qTimer);
    try{
      const j=await api("questions",null,"&session="+encodeURIComponent(qs.value)+"&device="+device());
      const box=$("qList"); box.replaceChildren();
      if(!j.items.length) box.append(el("p","note","No questions for this session yet. Be the first."));
      for(const q of j.items){
        const row=el("div","q"+(q.answered?" done":""));
        const v=el("button","vote"+(q.mine?" on":"")); v.type="button"; v.setAttribute("aria-pressed",String(q.mine));
        v.setAttribute("aria-label",(q.mine?"Remove your vote":"Vote for this question")+`, ${q.votes} vote${q.votes===1?"":"s"}`);
        v.append(el("span","arrow","▲"),el("span","n",String(q.votes)));
        v.onclick=async()=>{ try{ await api("vote",{qid:q.id,device:device()}); loadQuestions(); }catch(err){ $("qMsg").textContent=err.message; } };
        const b=el("div","q-body"); b.append(el("div","q-text",q.text)); b.append(el("div","q-meta",(q.name||"Anonymous")+(q.answered?" · answered":"")));
        row.append(v,b); box.append(row);
      }
    }catch{}
    if(!$("view-ask").hidden) qTimer=setTimeout(loadQuestions, document.hidden?20000:6000);
  }
  qs.addEventListener("change",loadQuestions);
  $("qName").value=store.get("qname")||"";
  $("qForm").addEventListener("submit",async e=>{
    e.preventDefault(); const m=$("qMsg"); m.className="note";
    const text=$("qText").value.trim(); if(text.length<8){ m.textContent="Write your question in a few more words."; m.className="note warn"; return; }
    $("qSend").disabled=true;
    try{ await api("ask",{session:qs.value,text,name:$("qName").value.trim(),device:device()}); store.set("qname",$("qName").value.trim());
      $("qText").value=""; m.textContent="Sent. Others can vote for it, and the moderator sees it straight away."; m.className="note ok"; loadQuestions(); }
    catch(err){ m.textContent=err.message; m.className="note warn"; }
    finally{ $("qSend").disabled=false; }
  });

  const saved=store.get("tab"); show(saved || (me ? "matches" : "join"));
}

// ==========================================================
// BIG SCREEN
// ==========================================================
function screen(){
  let real=[], ai=false, exChoice=store.get("screenEx"), showEx=exChoice ?? true;
  const sky=Sky($("sky"),{labelMax:80,big:true});
  const joinUrl=new URL("./",location.href).href;
  $("joinUrl").textContent=joinUrl.replace(/^https?:\/\//,"").replace(/\/$/,"");
  if(window.qrcode){ const q=qrcode(0,"M"); q.addData(joinUrl); q.make(); $("qr").innerHTML=q.createSvgTag({cellSize:6,margin:0,scalable:true}); }
  else $("qr").hidden=true;
  $("exToggle").checked=showEx;

  function render(){
    const l=real.slice(); if(showEx) l.push(...EX);
    const n=sky.set(l,null);
    $("cPeople").textContent=l.length; $("cLinks").textContent=n; $("cSectors").textContent=new Set(l.map(p=>p.sector)).size;
    $("btnInsight").hidden=!ai; $("aiOff").hidden=ai;
  }
  const f=feed((p,a)=>{ real=p; ai=a; if(exChoice===null){ showEx=real.length<6; $("exToggle").checked=showEx; } render(); }, 4000);
  $("exToggle").addEventListener("change",e=>{ showEx=exChoice=e.target.checked; store.set("screenEx",showEx); render(); });

  $("btnInsight").addEventListener("click",async()=>{
    const out=$("insight"); $("btnInsight").disabled=true; out.textContent="Thinking…";
    try{ const j=await api("insight",{}); out.textContent=j.text; }catch(err){ out.textContent=err.message; }
    finally{ $("btnInsight").disabled=false; }
  });

  // organiser tools
  let key="";
  $("adminForm").addEventListener("submit",async e=>{ e.preventDefault(); const k=$("adminKey").value;
    try{ const j=await api("admin",{key:k,op:"check"}); key=k; $("adminLogin").hidden=true; $("adminTools").hidden=false; $("adminMsg").textContent="";
      $("keyState").textContent=j.ai?"AI is on. Paste a new key to replace it, or save an empty box to switch AI off.":"AI is off. Paste your key and save to switch it on."; }
    catch(err){ $("adminMsg").textContent=err.message; } });
  $("keyForm").addEventListener("submit",async e=>{ e.preventDefault();
    try{ const j=await api("admin",{key,op:"setkey",api_key:$("apiKey").value}); $("apiKey").value=""; $("keyState").textContent=j.ai?"Saved. AI is on.":"Key removed. AI is off."; f.refresh(); }
    catch(err){ $("keyState").textContent=err.message; } });
  function confirmFlow(btnId, boxId, yesId, noId, op, what){
    $(btnId).addEventListener("click",()=>{ $(boxId).hidden=false; $(btnId).hidden=true; });
    $(noId).addEventListener("click",()=>{ $(boxId).hidden=true; $(btnId).hidden=false; });
    $(yesId).addEventListener("click",async()=>{ try{ const j=await api("admin",{key,op}); $("adminMsg").textContent=`Deleted ${j.deleted} ${what}${j.deleted===1?"":"s"}.`; f.refresh(); }
      catch(err){ $("adminMsg").textContent=err.message; } $(boxId).hidden=true; $(btnId).hidden=false; });
  }
  confirmFlow("btnClear","clearConfirm","btnClearYes","btnClearNo","clear","profile");
  confirmFlow("btnQClear","qClearConfirm","btnQClearYes","btnQClearNo","qclear","question");
  $("btnExport").addEventListener("click",async()=>{ try{ const j=await api("admin",{key,op:"export"});
    const rows=[["Name","Organisation","Role","Sector","Speaker","Why attending","Working on"],...j.people.map(p=>[p.name,p.company,p.role,p.sector,p.speaker?"Yes":"",p.interests.join("; "),p.work])];
    const csv=rows.map(r=>r.map(c=>`"${String(c??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob(["﻿"+csv],{type:"text/csv"})); a.download="sme-constellation.csv"; a.click(); }
    catch(err){ $("adminMsg").textContent=err.message; } });
  $("btnFull").addEventListener("click",()=>{ document.documentElement.requestFullscreen?.().catch(()=>{}); });
}

// ==========================================================
// HOST: audience questions for the moderator
// ==========================================================
function host(){
  let key=store.get("hostKey")||"", session=store.get("hostSession")||CFG.qa[0].key, timer=0, ai=false;
  const tabs=$("hostTabs");
  for(const s of CFG.qa){ const b=el("button",null,s.label.split(":")[0]); b.type="button"; b.dataset.s=s.key; b.title=s.label;
    b.onclick=()=>{ session=s.key; store.set("hostSession",session); $("hostSummary").textContent=""; draw(); }; tabs.append(b); }
  let items=[];
  async function load(){
    clearTimeout(timer);
    try{ const j=await api("admin",{key,op:"qall"}); items=j.items; ai=j.ai; $("hostForm").hidden=true; $("hostMain").hidden=false; draw(); }
    catch(err){ if(/password/i.test(err.message)){ key=""; store.del("hostKey"); $("hostForm").hidden=false; $("hostMain").hidden=true; $("hostMsg").textContent=err.message; return; } }
    timer=setTimeout(load, document.hidden?20000:5000);
  }
  function draw(){
    for(const b of tabs.children){ const n=items.filter(q=>q.s===b.dataset.s&&!q.hidden&&!q.answered).length;
      b.setAttribute("aria-selected",String(b.dataset.s===session)); b.textContent=b.title.split(":")[0]+(n?` (${n})`:""); }
    $("hostTitle").textContent=CFG.qa.find(s=>s.key===session)?.label||"";
    $("btnGroup").hidden=!ai;
    const box=$("hostList"); box.replaceChildren();
    const mine=items.filter(q=>q.s===session);
    if(!mine.length) box.append(el("p","note","No questions yet for this session."));
    for(const q of mine){
      const row=el("div","q host"+(q.answered?" done":"")+(q.hidden?" hid":""));
      row.append(el("div","votes",String(q.votes)));
      const b=el("div","q-body"); b.append(el("div","q-text",q.text),el("div","q-meta",(q.name||"Anonymous")+(q.hidden?" · hidden":"")+(q.answered?" · answered":"")));
      const act=el("div","row");
      const a=el("button","btn ghost small",q.answered?"Mark open":"Answered"); a.type="button"; a.onclick=()=>set(q.id,"answered");
      const h=el("button","btn ghost small",q.hidden?"Show":"Hide"); h.type="button"; h.onclick=()=>set(q.id,"hidden");
      act.append(a,h); b.append(act); row.append(b); box.append(row);
    }
  }
  async function set(qid,field){ try{ await api("admin",{key,op:"qset",qid,field}); load(); }catch(err){ $("hostSummary").textContent=err.message; } }
  $("btnGroup").addEventListener("click",async()=>{ const o=$("hostSummary"); o.textContent="Grouping the questions…"; $("btnGroup").disabled=true;
    try{ const j=await api("admin",{key,op:"qsummary",session}); o.textContent=j.text; }catch(err){ o.textContent=err.message; } finally{ $("btnGroup").disabled=false; } });
  $("hostForm").addEventListener("submit",e=>{ e.preventDefault(); key=$("hostKey").value; store.set("hostKey",key); $("hostMsg").textContent=""; load(); });
  $("btnLock").addEventListener("click",()=>{ key=""; store.del("hostKey"); clearTimeout(timer); $("hostForm").hidden=false; $("hostMain").hidden=true; });
  if(key) load(); else { $("hostForm").hidden=false; }
}

// ---------- start ----------
(async()=>{
  try{ CFG=await api("config"); }
  catch(err){ document.body.prepend(el("p","note warn boot",err.message)); return; }
  SECTOR_ORDER=CFG.sectors.map(s=>s[0]); COLOR=Object.fromEntries(CFG.sectors);
  // Optional add-ons: anything marked data-feature="polls" disappears when polls are switched off.
  if(!CFG.polls) for(const e of document.querySelectorAll('[data-feature="polls"]')) e.remove();
  window.SMEC={cfg:CFG, api, device, store, el, $};
  const page=document.body.dataset.page;
  if(page==="screen") screen(); else if(page==="host") host(); else if(page==="attendee") attendee();
  document.dispatchEvent(new CustomEvent("smec:ready"));
})();
})();
