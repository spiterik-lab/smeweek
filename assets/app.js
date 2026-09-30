/* SME Constellation – shared logic for the attendee page (index.html) and the big screen (screen.html). */
(() => {
"use strict";
const SECTORS = [
  ["Tourism & hospitality","#f2a65a"],["Gaming & digital entertainment","#c792ea"],["Shipping & maritime","#5ab0f2"],
  ["Blue & green economy","#6fcf97"],["Financial services","#e8d25b"],["Aviation & manufacturing","#9fb4d9"],
  ["Retail & trade","#f28b82"],["Professional services","#b5c77a"],["Tech & IT","#4fd1c5"],
  ["Public bodies & support","#d8a6c8"],["Education & training","#f5c29b"],["Other","#a9a9b8"]
];
const COLOR = Object.fromEntries(SECTORS);
const TOPICS = ["AI know-how","Automation","Data & analytics","Cybersecurity","Digital marketing","Software development",
  "Funding & grants","Investment","Training & upskilling","Recruitment & talent","Legal & compliance",
  "Export & new markets","Clients & customers","Suppliers & partners","Sustainability / ESG","Mentoring"];

// Fictional example attendees – shown only when switched on, never saved.
const EX = [
 ["Maria","Harbour Light Hotels","Operations Manager","Tourism & hospitality",["Clients & customers"],["Automation","AI know-how"]],
 ["Luke","Bluegate Logistics","CEO","Shipping & maritime",["Suppliers & partners","Export & new markets"],["Data & analytics","Automation"]],
 ["Rebecca","Pixelforge Studios","Head of Product","Gaming & digital entertainment",["Software development","AI know-how"],["Recruitment & talent","Investment"]],
 ["Daniel","Salina Fintech","CTO","Financial services",["Cybersecurity","Data & analytics"],["Clients & customers","Legal & compliance"]],
 ["Claire","Seabreeze Aquaculture","Founder","Blue & green economy",["Sustainability / ESG"],["Funding & grants","Data & analytics"]],
 ["Mark","Aerotech Components","Plant Manager","Aviation & manufacturing",["Suppliers & partners"],["Automation","Training & upskilling"]],
 ["Sarah","Corner Deli Group","Owner","Retail & trade",["Clients & customers"],["Digital marketing","AI know-how"]],
 ["Nathan","Grid & Ledger Advisory","Partner","Professional services",["Legal & compliance","Mentoring"],["Clients & customers"]],
 ["Elena","Cloudbay Systems","Solutions Architect","Tech & IT",["AI know-how","Automation","Software development"],["Clients & customers"]],
 ["Joseph","Skills Forward Agency","Programme Lead","Public bodies & support",["Funding & grants","Training & upskilling"],["Clients & customers"]],
 ["Anna","Northshore Academy","Director","Education & training",["Training & upskilling"],["AI know-how","Digital marketing"]],
 ["Kurt","Valley Print Works","Managing Director","Retail & trade",["Suppliers & partners"],["Automation","Export & new markets"]],
 ["Isabel","Tidewater Yachting","Commercial Manager","Shipping & maritime",["Clients & customers"],["Digital marketing","Data & analytics"]],
 ["Paul","Bright Ledger Accountants","Director","Professional services",["Legal & compliance"],["Automation","AI know-how"]],
 ["Julia","Greenroof Energy","Co-founder","Blue & green economy",["Sustainability / ESG","Mentoring"],["Investment","Recruitment & talent"]],
 ["Matthew","Secure Isle IT","Security Lead","Tech & IT",["Cybersecurity","Training & upskilling"],["Clients & customers"]],
 ["Chiara","Lantern Games","Community Manager","Gaming & digital entertainment",["Digital marketing"],["Data & analytics","Export & new markets"]],
 ["Ryan","Coastal Villas Collection","Owner","Tourism & hospitality",["Clients & customers"],["Digital marketing","Funding & grants"]],
 ["Nicole","Harbourline Insurance","HR Manager","Financial services",["Recruitment & talent"],["Training & upskilling","AI know-how"]],
 ["Adrian","Precision Moulds","Engineering Lead","Aviation & manufacturing",["Software development"],["Funding & grants","Cybersecurity"]],
 ["Sophie","Wordsmith Studio","Founder","Professional services",["Digital marketing"],["Clients & customers","Mentoring"]],
 ["Karl","Venture Isle Fund","Investment Associate","Financial services",["Investment","Mentoring"],["Clients & customers"]]
].map((r,i)=>({id:"ex"+i,name:r[0],company:r[1],role:r[2],sector:r[3],offer:r[4],need:r[5],work:"",example:true}));

const $ = id => document.getElementById(id);
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

// ---------- matching ----------
function score(a,b){
  let s=0; const why=[];
  const give=(a.need||[]).filter(t=>(b.offer||[]).includes(t));
  const take=(b.need||[]).filter(t=>(a.offer||[]).includes(t));
  s+=give.length*3+take.length*3;
  if(give.length) why.push(`${b.name} can offer ${give.map(lc).join(" and ")}, which you're looking for`);
  if(take.length) why.push(`you can help them with ${take.map(lc).join(" and ")}`);
  const shared=(a.need||[]).filter(t=>(b.need||[]).includes(t));
  if(shared.length){ s+=1; if(!give.length&&!take.length) why.push(`you're both looking for ${lc(shared[0])}`); }
  if(a.sector!==b.sector&&(give.length||take.length)) s+=1;
  return {s,why};
}
function links(list){
  const out=[];
  for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const {s}=score(list[i],list[j]); if(s>=3) out.push([i,j,s]);}
  return out;
}
const lc = t => /^[A-Z]{2}/.test(t) ? t : t.toLowerCase();

// ---------- the sky map ----------
function Sky(sky, opts={}){
  const cv=sky.querySelector("canvas"), ctx=cv.getContext("2d");
  const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W=0,H=0,nodes=[],edges=[],raf=0,heat=1,hover=null,pop=null,meId=null;
  const labelMax = opts.labelMax ?? 40, big = !!opts.big;
  function resize(){const r=sky.getBoundingClientRect();const d=Math.min(2,devicePixelRatio||1);W=r.width;H=r.height;cv.width=W*d;cv.height=H*d;ctx.setTransform(d,0,0,d,0,0);kick();}
  function anchor(sector){const i=SECTORS.findIndex(s=>s[0]===sector),n=SECTORS.length;const a=(i<0?n-1:i)/n*Math.PI*2-Math.PI/2,R=Math.min(W,H)*.3;return [W/2+Math.cos(a)*R*1.25,H/2+Math.sin(a)*R];}
  function set(list, me){
    meId=me; const old=new Map(nodes.map(n=>[n.p.id,n]));
    nodes=list.map(p=>{const o=old.get(p.id); if(o){o.p=p;return o;} const [x,y]=anchor(p.sector);
      return {p,x:x+(Math.random()-.5)*60,y:y+(Math.random()-.5)*60,vx:0,vy:0,born:performance.now(),tw:Math.random()*6};});
    edges=links(list);
    const lg=sky.querySelector(".legend"); if(lg){lg.replaceChildren(); const used=new Set(list.map(p=>p.sector));
      for(const s of SECTORS.filter(s=>used.has(s[0]))){const d=document.createElement("span"),i=document.createElement("i");i.style.background=s[1];d.append(i,document.createTextNode(s[0]));lg.append(d);}}
    const em=sky.querySelector(".empty"); if(em) em.hidden=list.length>0;
    kick(); return edges.length;
  }
  function kick(){heat=1; if(!raf) raf=requestAnimationFrame(tick);}
  function step(){const n=nodes.length;if(!n)return;const lg=sky.querySelector(".legend");const bottom=(lg?lg.offsetHeight:0)+34;const k=Math.min(W,H)/(Math.sqrt(n)+2);
    for(let i=0;i<n;i++){const a=nodes[i];for(let j=i+1;j<n;j++){const b=nodes[j];const dx=a.x-b.x,dy=a.y-b.y,d2=dx*dx+dy*dy+.01;if(d2>k*k*9)continue;const f=k*k*.06/d2;a.vx+=dx*f;a.vy+=dy*f;b.vx-=dx*f;b.vy-=dy*f;}}
    for(const [i,j,s] of edges){const a=nodes[i],b=nodes[j];const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;const f=(d-k*1.1)*.00008*(s/3)*d;a.vx+=dx/d*f;a.vy+=dy/d*f;b.vx-=dx/d*f;b.vy-=dy/d*f;}
    for(const a of nodes){const [ax,ay]=anchor(a.p.sector);a.vx+=(ax-a.x)*.004;a.vy+=(ay-a.y)*.004;a.vx*=.82;a.vy*=.82;a.x+=a.vx*heat;a.y+=a.vy*heat;a.x=Math.max(24,Math.min(W-24,a.x));a.y=Math.max(24,Math.min(H-bottom,a.y));}
    heat*=.985;}
  function draw(t){
    ctx.clearRect(0,0,W,H); ctx.fillStyle="rgba(241,233,216,.18)";
    for(let i=0;i<80;i++) ctx.fillRect((i*9973%1000)/1000*W,(i*6151%1000)/1000*H,1,1);
    const hi=hover||nodes.find(n=>n.p.id===meId);
    for(const [i,j,s] of edges){const a=nodes[i],b=nodes[j],on=hi&&(a===hi||b===hi);
      ctx.strokeStyle=on?"rgba(232,176,75,.85)":`rgba(154,168,192,${.12+.06*s/3})`;ctx.lineWidth=on?1.6:1;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    const labels=nodes.length<=labelMax, fs=big?14:12;
    for(const nd of nodes){const p=nd.p,isMe=p.id===meId,age=Math.min(1,(t-nd.born)/700),tw=reduce?1:.85+.15*Math.sin(t/700+nd.tw);
      const r=(isMe?7:big?6:5)*(.4+.6*age),c=COLOR[p.sector]||"#a9a9b8";
      ctx.globalAlpha=(p.example?.55:1)*age*.35*tw;const g=ctx.createRadialGradient(nd.x,nd.y,0,nd.x,nd.y,r*4);g.addColorStop(0,c);g.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(nd.x,nd.y,r*4,0,7);ctx.fill();
      ctx.globalAlpha=(p.example?.6:1)*age;ctx.fillStyle=c;ctx.beginPath();ctx.arc(nd.x,nd.y,r,0,7);ctx.fill();
      if(isMe){ctx.strokeStyle="#e8b04b";ctx.lineWidth=2;ctx.beginPath();ctx.arc(nd.x,nd.y,r+4,0,7);ctx.stroke();}
      if(labels||isMe||nd===hover){ctx.globalAlpha=(p.example?.55:.95)*age;ctx.fillStyle=isMe?"#e8b04b":"#f1e9d8";ctx.font=`${isMe?600:500} ${fs}px "IBM Plex Sans",system-ui,sans-serif`;ctx.textAlign="center";ctx.fillText(isMe?`${p.name} (you)`:p.name,nd.x,nd.y+r+fs+2);}
      ctx.globalAlpha=1;}
  }
  function tick(t){raf=0;if(heat>.02)step();draw(t);if(heat>.02||!reduce)raf=requestAnimationFrame(tick);}
  function at(x,y){let best=null,bd=22*22;for(const n of nodes){const d=(n.x-x)**2+(n.y-y)**2;if(d<bd){bd=d;best=n;}}return best;}
  function showPop(n){ if(pop){pop.remove();pop=null;} if(!n) return;
    pop=document.createElement("div");pop.className="card-pop";
    const b=document.createElement("b");b.textContent=n.p.name+(n.p.example?"  ·  example":"");
    const m=document.createElement("div");m.className="meta";m.textContent=[n.p.role,n.p.company].filter(Boolean).join(", ");
    const s=document.createElement("div");s.className="meta";s.textContent=n.p.sector;
    const tg=document.createElement("div");tg.className="tags";
    for(const x of n.p.offer||[]){const e=document.createElement("span");e.className="tag";e.textContent="Offers: "+x;tg.append(e);}
    for(const x of n.p.need||[]){const e=document.createElement("span");e.className="tag need";e.textContent="Needs: "+x;tg.append(e);}
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
  let v=-1, people=[], ai=false, timer=0;
  async function poll(){
    try{ const j=await api("list",null,"&since="+v); if(!j.unchanged){ v=j.v; people=j.people; ai=!!j.ai; onChange(people,ai,j.title); } }
    catch{}
    timer=setTimeout(poll, document.hidden?every*3:every);
  }
  document.addEventListener("visibilitychange",()=>{ if(!document.hidden){ clearTimeout(timer); poll(); } });
  poll();
  return {refresh(){ clearTimeout(timer); v=-1; poll(); }};
}

// ==========================================================
// ATTENDEE PAGE
// ==========================================================
function attendee(){
  let real=[], ai=false, me=store.get("me"); // me = {id, token, profile}
  let showEx=false, exTouched=false;
  const pick={offer:new Set(),need:new Set()};
  const sky=Sky($("sky"));
  const people=()=>{ const l=real.slice(); if(showEx) l.push(...EX); return l; };
  const myProfile=()=> me && real.find(p=>p.id===me.id);

  function render(){
    const list=people();
    const n=sky.set(list, me?.id);
    $("cPeople").textContent=list.length; $("cLinks").textContent=n; $("cSectors").textContent=new Set(list.map(p=>p.sector)).size;
    if(!$("view-matches").hidden) renderMatches();
  }
  const f=feed((p,a)=>{ real=p; ai=a;
    if(me && !real.some(x=>x.id===me.id)){ me=null; store.del("me"); resetForm(); }
    if(!exTouched){ showEx=real.length<6; $("exToggle").checked=showEx; }
    render(); }, 8000);

  // tabs
  function show(view){
    for(const b of document.querySelectorAll("nav.tabs button")) b.setAttribute("aria-selected",String(b.dataset.view===view));
    for(const v of ["join","matches","map"]) $("view-"+v).hidden=v!==view;
    if(view==="map") sky.resize();
    if(view==="matches") renderMatches();
    store.set("tab",view);
  }
  for(const b of document.querySelectorAll("nav.tabs button")) b.addEventListener("click",()=>show(b.dataset.view));
  $("emptyJoin").addEventListener("click",()=>show("join"));

  // form
  const sel=$("fSector"); sel.append(new Option("Choose a sector",""));
  for(const [s] of SECTORS) sel.append(new Option(s,s));
  function chips(box,kind){ for(const t of TOPICS){ const c=document.createElement("button"); c.type="button"; c.className="chip"; c.textContent=t; c.setAttribute("aria-pressed","false");
    c.addEventListener("click",()=>{ const s=pick[kind]; if(s.has(t)) s.delete(t); else { if(s.size>=3) return msg(`Pick up to 3 for "${kind==="offer"?"I can offer":"I'm looking for"}".`,"warn"); s.add(t);} c.setAttribute("aria-pressed",String(s.has(t))); });
    box.append(c);} }
  chips($("chipsOffer"),"offer"); chips($("chipsNeed"),"need");
  function msg(t,cls){ const m=$("joinMsg"); m.textContent=t; m.className="note "+(cls||""); }
  function syncChips(){ for(const c of $("chipsOffer").children) c.setAttribute("aria-pressed",String(pick.offer.has(c.textContent)));
                        for(const c of $("chipsNeed").children) c.setAttribute("aria-pressed",String(pick.need.has(c.textContent))); }
  function fillForm(p){ $("fName").value=p.name||""; $("fCompany").value=p.company||""; $("fRole").value=p.role||""; sel.value=p.sector||""; $("fWork").value=p.work||"";
    $("fConsent").checked=true; pick.offer=new Set(p.offer||[]); pick.need=new Set(p.need||[]); syncChips();
    $("btnSave").textContent="Update my details"; $("btnRemoveMe").hidden=false; }
  function resetForm(){ $("joinForm").reset(); pick.offer.clear(); pick.need.clear(); syncChips(); $("btnSave").textContent="Add me to the map"; $("btnRemoveMe").hidden=true; }
  if(me?.profile) fillForm(me.profile);

  $("joinForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const p={name:$("fName").value.trim(),company:$("fCompany").value.trim(),role:$("fRole").value.trim(),sector:sel.value,offer:[...pick.offer],need:[...pick.need],work:$("fWork").value.trim()};
    if(!p.name||!p.company||!p.sector) return msg("Add your name, organisation and sector.","warn");
    if(!p.offer.length||!p.need.length) return msg("Pick at least one thing you can offer and one you're looking for.","warn");
    if(!$("fConsent").checked) return msg("Tick the consent box so others can see your details.","warn");
    $("btnSave").disabled=true; msg("Saving…");
    try{
      const j=await api("join",{...p,consent:true,id:me?.id||"",token:me?.token||""});
      me={id:j.id,token:j.token,profile:p}; store.set("me",me); fillForm(p);
      msg("You're on the map. Opening your matches…","ok"); f.refresh();
      setTimeout(()=>show("matches"),900);
    }catch(err){ msg(err.message,"warn"); }
    finally{ $("btnSave").disabled=false; }
  });
  $("btnRemoveMe").addEventListener("click",async()=>{
    if(!me) return;
    try{ await api("remove",{id:me.id,token:me.token}); }catch(err){ return msg(err.message,"warn"); }
    me=null; store.del("me"); resetForm(); msg("You've been removed from the map.","ok"); f.refresh();
  });

  // matches
  const aiCache=new Map();
  function renderMatches(){
    const list=$("matchList"); list.replaceChildren();
    const mine=myProfile() || (me?.profile ? {...me.profile,id:me.id} : null);
    if(!mine){ $("matchTitle").textContent="Your three people to meet"; $("matchIntro").textContent="Add yourself first. Your matches appear here straight away.";
      const b=document.createElement("button"); b.className="btn primary"; b.type="button"; b.textContent="Add yourself"; b.onclick=()=>show("join"); list.append(b); return; }
    const ranked=people().filter(p=>p.id!==mine.id).map(p=>({p,...score(mine,p)})).filter(r=>r.s>0).sort((a,b)=>b.s-a.s).slice(0,3);
    $("matchTitle").textContent=`${mine.name}, your ${ranked.length===1?"best match":"three people to meet"}`;
    $("matchIntro").textContent=ranked.length?"Ranked by how well what you need lines up with what they offer, and the other way round.":"No strong matches yet. Check back as more people join.";
    for(const r of ranked){
      const card=document.createElement("article"); card.className="match";
      const who=document.createElement("div"); who.className="who";
      const dot=document.createElement("span"); dot.className="dot"; dot.style.background=COLOR[r.p.sector]||"#aaa";
      const h=document.createElement("h3"); h.textContent=r.p.name; who.append(dot,h);
      if(r.p.example){ const fl=document.createElement("span"); fl.className="example-flag"; fl.textContent="example"; who.append(fl); }
      const sc=document.createElement("span"); sc.className="score"; sc.textContent=`${Math.min(99,50+r.s*7)}% fit`; who.append(sc);
      const meta=document.createElement("div"); meta.className="meta"; meta.textContent=[r.p.role,r.p.company].filter(Boolean).join(", ")+" · "+r.p.sector;
      const why=document.createElement("div"); why.className="why"; const w=r.why.join("; "); why.textContent=w.charAt(0).toUpperCase()+w.slice(1)+".";
      const out=document.createElement("div"); out.className="ai"; out.hidden=true;
      const btn=document.createElement("button"); btn.type="button"; btn.className="btn ghost"; btn.textContent="Suggest an opening line";
      btn.hidden=!ai || r.p.example;
      if(aiCache.has(r.p.id)){ out.hidden=false; out.textContent=aiCache.get(r.p.id); btn.hidden=true; }
      btn.addEventListener("click",async()=>{ btn.disabled=true; out.hidden=false; out.textContent="Thinking…";
        try{ const j=await api("icebreaker",{id:me.id,token:me.token,other:r.p.id}); const t=`“${j.opener}”${j.explore?"\n\n"+j.explore:""}`; out.textContent=t; aiCache.set(r.p.id,t); btn.hidden=true; }
        catch(err){ out.textContent=err.message; } finally{ btn.disabled=false; } });
      card.append(who,meta,why,btn,out); list.append(card);
    }
  }
  $("exToggle").addEventListener("change",e=>{ showEx=e.target.checked; exTouched=true; render(); });

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
    const list=real.slice(); if(showEx) list.push(...EX);
    const n=sky.set(list,null);
    $("cPeople").textContent=list.length; $("cLinks").textContent=n; $("cSectors").textContent=new Set(list.map(p=>p.sector)).size;
    $("btnInsight").hidden=!ai; $("aiOff").hidden=ai;
  }
  const f=feed((p,a,title)=>{ real=p; ai=a; if(title) $("evTitle").textContent=title;
    if(exChoice===null){ showEx=real.length<6; $("exToggle").checked=showEx; } render(); }, 4000);
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
  $("btnClear").addEventListener("click",()=>{ $("clearConfirm").hidden=false; $("btnClear").hidden=true; });
  $("btnClearNo").addEventListener("click",()=>{ $("clearConfirm").hidden=true; $("btnClear").hidden=false; });
  $("btnClearYes").addEventListener("click",async()=>{ try{ const j=await api("admin",{key,op:"clear"}); $("adminMsg").textContent=`Deleted ${j.deleted} profile${j.deleted===1?"":"s"}.`; f.refresh(); }
    catch(err){ $("adminMsg").textContent=err.message; } $("clearConfirm").hidden=true; $("btnClear").hidden=false; });
  $("btnExport").addEventListener("click",async()=>{ try{ const j=await api("admin",{key,op:"export"});
    const rows=[["Name","Organisation","Role","Sector","Offers","Looking for","Working on"],...j.people.map(p=>[p.name,p.company,p.role,p.sector,p.offer.join("; "),p.need.join("; "),p.work])];
    const csv=rows.map(r=>r.map(c=>`"${String(c??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob(["﻿"+csv],{type:"text/csv"})); a.download="sme-constellation.csv"; a.click(); }
    catch(err){ $("adminMsg").textContent=err.message; } });
  $("btnFull").addEventListener("click",()=>{ document.documentElement.requestFullscreen?.().catch(()=>{}); });
}

document.body.dataset.page==="screen" ? screen() : attendee();
})();
