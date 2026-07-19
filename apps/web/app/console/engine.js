// ORYQON Command Console — HUD dashboard engine. Call startConsole() after the
// markup is mounted; it returns a cleanup function.
export function startConsole() {
  "use strict";
  var rafId=0, clockIv=0, bootIv=0;
  var prevOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(id){ return document.getElementById(id); }
  function el(tag, cls, html){ var e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; }

  // deterministic-ish PRNG
  var seed = 0x9e3a71c5;
  function rnd(){ seed=(seed*1664525+1013904223)>>>0; return seed/0xffffffff; }
  function ri(a,b){ return a+Math.floor(rnd()*(b-a+1)); }
  function pick(a){ return a[Math.floor(rnd()*a.length)]; }
  function hex(n){ var s=""; for(var i=0;i<n;i++) s+="0123456789abcdef"[Math.floor(rnd()*16)]; return s; }
  function corr(){ return "ORQ-"+hex(4).toUpperCase(); }
  function nowUTC(){ var d=new Date(); function p(n){return String(n).padStart(2,"0");} return p(d.getUTCHours())+":"+p(d.getUTCMinutes())+":"+p(d.getUTCSeconds()); }

  // ---------- nav ----------
  var NAV = ["Command","Operations","Products","Campaigns","Channels","Customers","Entitlements","Intelligence","Evidence","System"];
  (function(){ var n=$("nav"); NAV.forEach(function(x,i){ var a=el("a", i===0?"active":""); a.href="#"; a.innerHTML='<span class="ic"></span>'+x; n.appendChild(a); }); })();

  // ---------- vocab ----------
  var ACTORS = ["ops.discovery","agent.copy","agent.channel-compiler","ops.pricing","agent.evidence","ops.support","agent.experiment","agent.analytics","ops.fulfilment"];
  var ACTIONS = ["PUBLISH_CONTENT","ACTIVATE_OFFER","PRICE_CHANGE","IMPORT_PRODUCT","COMPILE_CHANNEL_VARIANT","REFUND_ISSUE","ENTITLEMENT_GRANT"];
  var CHANNELS = ["Shopify","Instagram","YouTube","LinkedIn","Pinterest","Email","Digital delivery","Marketplace"];
  var TOOLS = ["shopify.publish","instagram.publish","ledger.read","evidence.fetch","offer.price.write","email.send","entitlement.issue"];
  var AGENTS = ["channel-compiler","copy","evidence","offer","experiment","analytics","support"];

  // policy engine mirror (default-deny)
  function evalPolicy(action, risk, hasEvidence, expired){
    if (expired) return ["DENY","ACTION_EXPIRED"];
    if ((action==="PUBLISH_CONTENT"||action==="ACTIVATE_OFFER") && !hasEvidence) return ["DENY","PUBLISH_WITHOUT_EVIDENCE"];
    if ((action==="PUBLISH_CONTENT"||action==="ACTIVATE_OFFER"||action==="PRICE_CHANGE") && risk>=4) return ["REVIEW","HIGH_RISK_REQUIRES_REVIEW"];
    if ((action==="IMPORT_PRODUCT"||action==="COMPILE_CHANNEL_VARIANT") && risk<4) return ["ALLOW","LOW_RISK_ALLOWED"];
    return ["DENY","DEFAULT_DENY"];
  }
  function decClass(d){ return d==="ALLOW"?"allow":d==="REVIEW"?"review":"deny"; }

  // ---------- KPI tiles ----------
  var TILES = [
    { id:"rev", lab:"Revenue · today", accent:false, unit:"", val:128450, tgt:128450, fmt:function(v){ return "£"+Math.round(v).toLocaleString(); }, spark:[], delta:1 },
    { id:"rel", lab:"Execution reliability", accent:false, unit:"%", val:99.94, tgt:99.94, fmt:function(v){ return v.toFixed(2); }, spark:[], delta:1 },
    { id:"dec", lab:"Decisions · per min", accent:true, unit:"", val:52, tgt:52, fmt:function(v){ return Math.round(v).toString(); }, spark:[], delta:1 },
    { id:"apr", lab:"Approvals awaiting", accent:false, unit:"", val:5, tgt:5, fmt:function(v){ return Math.round(v).toString(); }, spark:[], delta:-1 },
    { id:"units", lab:"Autonomous units", accent:true, unit:"", val:24, tgt:24, fmt:function(v){ return Math.round(v).toString(); }, spark:[], delta:1 }
  ];
  var tileEls = {};
  (function(){
    var host=$("tiles");
    TILES.forEach(function(t){
      var box=el("div","tile"+(t.accent?" accent":""));
      box.innerHTML='<div class="lab">'+t.lab+'</div><div class="val"><span class="num"></span><span class="u">'+t.unit+'</span></div>'+
        '<div class="sub"><span class="delta"></span><span class="fresh">live</span></div><canvas></canvas>';
      host.appendChild(box);
      tileEls[t.id]={ num:box.querySelector(".num"), delta:box.querySelector(".delta"), cv:box.querySelector("canvas") };
      for(var i=0;i<40;i++) t.spark.push(0.5);
    });
  })();

  // ---------- topology ----------
  (function(){
    var host=$("topo");
    var nodes=[["Shopify","ok"],["Product Passport","ok"],["Instagram","ok"],["YouTube","ok"],["Ledger","ok"],["Storefront","ok"],["Email","deg"],["Marketplace","ok"]];
    nodes.forEach(function(n){ var d=el("div","node"); d.innerHTML='<span class="st '+n[1]+'"></span>'+n[0]+'<span class="lt">'+ri(8,60)+'ms</span>'; host.appendChild(d); });
  })();

  // ---------- lifecycle ----------
  var LIFE = [["01","Proposed",34],["02","Review",8],["03","Authorised",6],["04","Executing",11],["05","Executed","1,204"]];
  (function(){
    var host=$("life");
    LIFE.forEach(function(s,i){
      var st=el("div","stage"+(i<4?" on":""));
      st.innerHTML='<div class="sn">'+s[0]+"</div><div class='sn' style='letter-spacing:.06em;color:var(--dim)'>"+s[1]+'</div><div class="sc">'+s[2]+'</div><div class="flow"></div>';
      host.appendChild(st);
      if(i<LIFE.length-1){ var ar=el("div","arrow","›"); host.appendChild(ar); }
    });
  })();
  var flows = Array.prototype.map.call(document.querySelectorAll("#life .flow"), function(f){ return f; });

  // ---------- active operations ----------
  function renderOps(){
    var host=$("ops"); host.innerHTML="";
    var data=[
      ["Executing within policy", ri(38,46), "executing"],
      ["Monitoring outcomes", ri(9,14), "cyan"],
      ["Awaiting verified data", ri(4,8), "awaiting"],
      ["Compiling channel variants", ri(3,7), "cyan"]
    ];
    data.forEach(function(d){
      var r=el("div","row"); r.style.gridTemplateColumns="1fr auto auto";
      r.innerHTML='<span>'+d[0]+'</span><span class="tnum" style="color:var(--bone);font-weight:600">'+d[1]+'</span><span class="chip '+d[2]+'"><span class="d"></span>'+ (d[2]==="awaiting"?"hold":d[2]) +'</span>';
      host.appendChild(r);
    });
    $("opsMeta").textContent = (LIFE[3][2]) + " in flight";
  }

  // ---------- approvals queue ----------
  var approvals=[];
  function riskEl(n){ var s='<span class="risk">'; for(var i=0;i<6;i++){ var c=i<n?(n>=5&&i>=4?"hi":"on"):""; s+='<i class="'+c+'"></i>'; } return s+'</span>'; }
  function newApproval(){
    var action=pick(["PRICE_CHANGE","REFUND_ISSUE","ACTIVATE_OFFER","ENTITLEMENT_GRANT","POLICY_ACTIVATE"]);
    var risk=ri(3,6); var stepUp = risk>=4 || action==="PRICE_CHANGE" || action==="POLICY_ACTIVATE";
    return { id:corr(), action:action, risk:risk, stepUp:stepUp, actor:pick(ACTORS), exp:ri(45,180) };
  }
  for(var ia=0; ia<5; ia++) approvals.push(newApproval());
  function renderApprovals(){
    var host=$("approvals"); host.innerHTML="";
    approvals.forEach(function(a){
      var r=el("div","row"); r.style.gridTemplateColumns="86px 1fr auto auto auto auto";
      var exp = a.exp>0? (a.exp+"s") : "expired";
      r.innerHTML =
        '<span class="id">'+a.id+'</span>'+
        '<span>'+a.action.replace(/_/g," ").toLowerCase()+'</span>'+
        riskEl(a.risk)+
        (a.stepUp?'<span class="chip stepup"><span class="d"></span>step-up</span>':'<span class="mut" style="font-size:10px">AAL-1</span>')+
        '<span class="mut tnum" style="min-width:52px;text-align:right">'+exp+'</span>'+
        '<span style="display:flex;gap:5px"><button class="btn-mini ok" data-ok="'+a.id+'">Authorize</button><button class="btn-mini no" data-no="'+a.id+'">Deny</button></span>';
      host.appendChild(r);
    });
    setTile("apr", approvals.length);
  }
  function resolveApproval(id, ok){
    var idx=-1; for(var i=0;i<approvals.length;i++) if(approvals[i].id===id) idx=i;
    if(idx<0) return;
    var a=approvals[idx]; approvals.splice(idx,1);
    pushAudit(ok?"APPROVAL_AUTHORISED":"APPROVAL_DENIED", a.actor, a.id);
    pushPolicy(a.actor, a.action, ok?"ALLOW":"DENY", ok?"HUMAN_AUTHORISED":"HUMAN_DENIED", a.id);
    blip(ok?"ok":"deny");
    renderApprovals();
  }
  document.getElementById("approvals").addEventListener("click", function(e){
    var ok=e.target.getAttribute&&e.target.getAttribute("data-ok");
    var no=e.target.getAttribute&&e.target.getAttribute("data-no");
    if(ok) resolveApproval(ok,true); else if(no) resolveApproval(no,false);
  });

  // ---------- policy stream ----------
  function pushPolicy(actor, action, dec, reason, cid){
    var host=$("policy");
    var ln=el("div","ln"); ln.style.gridTemplateColumns="60px 150px 1fr auto auto";
    ln.innerHTML='<span class="ts">'+nowUTC()+'</span>'+
      '<span class="mut">'+actor+'</span>'+
      '<span>'+action.replace(/_/g," ").toLowerCase()+' <span class="mut" style="font-size:10px">· '+reason.toLowerCase()+'</span></span>'+
      '<span class="chip '+decClass(dec)+'"><span class="d"></span>'+dec+'</span>'+
      '<span class="co">'+(cid||corr())+'</span>';
    host.insertBefore(ln, host.firstChild);
    while(host.children.length>9) host.removeChild(host.lastChild);
  }
  function streamPolicy(){
    var action=pick(ACTIONS); var risk=ri(1,6); var hasEv=rnd()<0.75; var expired=rnd()<0.05;
    var r=evalPolicy(action,risk,hasEv,expired);
    pushPolicy(pick(ACTORS), action, r[0], r[1]);
    if(r[0]==="DENY") blip("deny"); else if(r[0]==="REVIEW") blip("review"); else blip("allow");
    setTile("dec", 44+ri(0,26));
  }

  // ---------- channels ----------
  var chData = CHANNELS.map(function(c){ return { name:c, deg: c==="Email", lat:ri(12,80), quota:ri(20,80) }; });
  function renderChannels(){
    var host=$("channels"); host.innerHTML="";
    chData.forEach(function(c){
      var r=el("div","row"); r.style.gridTemplateColumns="1fr 54px 70px 90px";
      var warn=c.quota>78;
      r.innerHTML='<span>'+c.name+'</span>'+
        '<span class="chip '+(c.deg?"degraded":"nominal")+'" style="justify-self:start"><span class="d"></span>'+(c.deg?"deg":"ok")+'</span>'+
        '<span class="mut tnum">'+c.lat+'ms</span>'+
        '<span class="quota"><i class="'+(warn?"warn":"")+'" style="width:'+c.quota+'%"></i></span>';
      host.appendChild(r);
    });
  }
  function driftChannels(){
    chData.forEach(function(c){ c.lat=Math.max(8, c.lat+ri(-6,6)); c.quota=Math.min(96, Math.max(10, c.quota+ri(-4,5))); });
    renderChannels();
  }

  // ---------- evidence ----------
  (function(){
    var host=$("evidence");
    var data=[
      ["Waterproof to 10,000mm","LAB · LR-0912","verified"],
      ["78% recycled shell","CERT · SC-334","verified"],
      ["Ships carbon-neutral","AUDIT · CN-118","verified"],
      ["Battery 40h runtime","LAB · LR-1180","pending"],
      ["Rights · paid + organic","RIGHTS-OK","verified"]
    ];
    data.forEach(function(d){
      var r=el("div","row"); r.style.gridTemplateColumns="1fr auto auto";
      r.innerHTML='<span>'+d[0]+'</span><span class="mut" style="font-size:10.5px">'+d[1]+'</span><span class="chip '+d[2]+'"><span class="d"></span>'+d[2]+'</span>';
      host.appendChild(r);
    });
  })();

  // ---------- broker / agent runs ----------
  function streamBroker(){
    var host=$("broker");
    var agent=pick(AGENTS); var tool=pick(TOOLS);
    var allowed = !(tool.indexOf("write")>=0 || tool.indexOf("publish")>=0 || tool.indexOf("issue")>=0) || rnd()<0.55;
    var reason = allowed? "OK" : pick(["APPROVAL_REQUIRED","TOOL_NOT_ALLOWED_FOR_AGENT","TENANT_MISMATCH"]);
    var ln=el("div","ln"); ln.style.gridTemplateColumns="60px 130px 1fr auto";
    ln.innerHTML='<span class="ts">'+nowUTC()+'</span>'+
      '<span class="mut">agent.'+agent+'</span>'+
      '<span>'+tool+'</span>'+
      '<span class="chip '+(allowed?"ok":"deny")+'"><span class="d"></span>'+(allowed?"broker ok":reason.toLowerCase())+'</span>';
    host.insertBefore(ln, host.firstChild);
    while(host.children.length>8) host.removeChild(host.lastChild);
  }

  // ---------- audit (hash chain) ----------
  var prevDigest = hex(8);
  function pushAudit(action, actor, cid){
    var host=$("audit");
    var digest=hex(8);
    var ln=el("div","ln"); ln.style.gridTemplateColumns="60px 150px 1fr 220px auto";
    ln.innerHTML='<span class="ts">'+nowUTC()+'</span>'+
      '<span class="mut">'+actor+'</span>'+
      '<span>'+action.replace(/_/g," ").toLowerCase()+'</span>'+
      '<span class="hash">'+prevDigest+' → <span style="color:var(--cyan)">'+digest+'</span></span>'+
      '<span class="co">'+(cid||corr())+'</span>';
    host.insertBefore(ln, host.firstChild);
    while(host.children.length>8) host.removeChild(host.lastChild);
    prevDigest=digest;
  }
  function streamAudit(){ pushAudit(pick(["ACTION_EXECUTED","RECEIPT_SIGNED","OFFER_ACTIVATED","EVIDENCE_VALIDATED","CONTENT_PUBLISHED","SETTING_RESOLVED"]), pick(ACTORS)); }

  // ---------- tiles update ----------
  function setTile(id, tgt){ for(var i=0;i<TILES.length;i++) if(TILES[i].id===id) TILES[i].tgt=tgt; }
  function tickTargets(){
    setTile("rev", TILES[0].tgt + ri(20,420));
    setTile("rel", Math.min(99.99, Math.max(99.8, 99.9 + rnd()*0.09)));
    setTile("units", 22+ri(0,6));
  }

  // ---------- canvases ----------
  var DPR = Math.min(window.devicePixelRatio||1, 2);
  function setupCanvas(cv, w, h){ cv.width=w*DPR; cv.height=h*DPR; var c=cv.getContext("2d"); c.setTransform(DPR,0,0,DPR,0,0); return c; }

  function drawSpark(t){
    var cv=tileEls[t.id].cv; var w=cv.clientWidth||160, h=34;
    if(cv.width!==Math.round(w*DPR)) setupCanvas(cv, w, h);
    var c=cv.getContext("2d"); c.clearRect(0,0,w,h);
    var arr=t.spark, n=arr.length, min=Math.min.apply(null,arr), max=Math.max.apply(null,arr), rng=(max-min)||1;
    c.beginPath();
    for(var i=0;i<n;i++){ var x=i/(n-1)*w, y=h-4-((arr[i]-min)/rng)*(h-8); if(i===0)c.moveTo(x,y); else c.lineTo(x,y); }
    var col = t.accent? "#8ad8ff" : (t.delta<0? "#f1b85b" : "#7fb08a");
    c.strokeStyle=col; c.lineWidth=1.4; c.stroke();
    c.lineTo(w,h); c.lineTo(0,h); c.closePath();
    c.fillStyle = t.accent? "rgba(138,216,255,0.12)" : (t.delta<0?"rgba(241,184,91,0.1)":"rgba(127,176,138,0.1)");
    c.fill();
  }

  var gaugeCtx = setupCanvas($("gauge"),104,104), gaugeVal=98.5, gaugeTgt=99.2;
  function drawGauge(){
    var c=gaugeCtx, cx=52, cy=52, r=42;
    c.clearRect(0,0,104,104);
    c.beginPath(); c.arc(cx,cy,r,0,Math.PI*2); c.strokeStyle="rgba(255,255,255,0.06)"; c.lineWidth=7; c.stroke();
    var frac=gaugeVal/100, a0=-Math.PI/2, a1=a0+frac*Math.PI*2;
    c.beginPath(); c.arc(cx,cy,r,a0,a1); c.strokeStyle= gaugeVal>99?"#7fb08a": gaugeVal>97?"#8ad8ff":"#f1b85b"; c.lineWidth=7; c.lineCap="round"; c.stroke();
    c.beginPath(); c.arc(cx,cy,r-11,a0, a0+frac*Math.PI*2); c.strokeStyle="rgba(138,216,255,0.25)"; c.lineWidth=2; c.stroke();
  }

  var waveCtx=setupCanvas($("wave"), $("wave").clientWidth||560, 46), wave=[];
  for(var iw=0; iw<120; iw++) wave.push(0.4);
  function drawWave(){
    var cv=$("wave"), w=cv.clientWidth||560, h=46;
    if(cv.width!==Math.round(w*DPR)){ waveCtx=setupCanvas(cv,w,h); }
    var c=waveCtx; c.clearRect(0,0,w,h);
    c.strokeStyle="rgba(138,216,255,0.7)"; c.lineWidth=1.3; c.beginPath();
    for(var i=0;i<wave.length;i++){ var x=i/(wave.length-1)*w, y=h-2-wave[i]*(h-6); if(i===0)c.moveTo(x,y); else c.lineTo(x,y); }
    c.stroke();
    c.lineTo(w,h); c.lineTo(0,h); c.closePath(); c.fillStyle="rgba(138,216,255,0.08)"; c.fill();
  }

  // ---------- audio ----------
  var audio=null, master=null, muted=true, audioReady=false, lastBlip=0;
  function initAudio(){
    if(audioReady) return; var AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
    audio=new AC(); master=audio.createGain(); master.gain.value=0;
    var comp=audio.createDynamicsCompressor(); comp.threshold.value=-14; master.connect(comp); comp.connect(audio.destination);
    // low console hum
    var hum=audio.createGain(); hum.gain.value=0.04; var hlp=audio.createBiquadFilter(); hlp.type="lowpass"; hlp.frequency.value=280;
    hum.connect(hlp); hlp.connect(master);
    [60,90].forEach(function(f){ var o=audio.createOscillator(); o.type="sine"; o.frequency.value=f; var g=audio.createGain(); g.gain.value=0.5; o.connect(g); g.connect(hum); o.start(); });
    audioReady=true;
  }
  function blip(kind){
    if(!audioReady||muted) return; var t=audio.currentTime; if(t-lastBlip<0.05) return; lastBlip=t;
    var f = kind==="allow"?880 : kind==="ok"?990 : kind==="review"?587 : kind==="deny"?300 : kind==="ui"?1320 : 660;
    var vol = kind==="deny"?0.05 : kind==="ui"?0.018 : 0.03;
    var o=audio.createOscillator(); o.type= kind==="deny"?"triangle":"sine"; o.frequency.value=f;
    var g=audio.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+0.005); g.gain.exponentialRampToValueAtTime(0.0001,t+0.18);
    o.connect(g); g.connect(master); o.start(t); o.stop(t+0.2);
  }
  function setMuted(m){ muted=m; var b=$("soundBtn"); b.classList.toggle("muted",m); b.setAttribute("aria-pressed",String(!m)); $("soundLabel").textContent=m?"Sound off":"Sound on";
    if(audioReady){ var t=audio.currentTime; master.gain.cancelScheduledValues(t); master.gain.setTargetAtTime(m?0:0.6,t,0.3); } }

  // ---------- clock + scrubber ----------
  clockIv = setInterval(function(){ $("clock").textContent=nowUTC()+" UTC"; }, 250);
  $("scrub").addEventListener("input", function(){
    var v=+this.value; $("scrubNow").textContent = v>=100? "live" : "T−"+Math.round((100-v)*0.6)+"m";
    $("scrubNow").style.color = v>=100? "var(--cyan)" : "var(--amber)";
    blip("review");
  });

  // ---------- HUD interaction motion ----------
  var appEl = document.querySelector(".app") || document.body;
  var reticle = document.createElement("div"); reticle.className = "reticle";
  reticle.innerHTML = '<span class="rx"></span><span class="ry"></span><span class="rb tl"></span><span class="rb tr"></span><span class="rb bl"></span><span class="rb br"></span>';
  appEl.appendChild(reticle);
  var navscanEl = document.createElement("div"); navscanEl.className = "navscan"; appEl.appendChild(navscanEl);
  var glitchEl = document.createElement("div"); glitchEl.className = "glitchflash"; appEl.appendChild(glitchEl);
  Array.prototype.forEach.call(document.querySelectorAll(".panel"), function(p){ var s=document.createElement("span"); s.className="scanbar"; p.appendChild(s); });

  var mx=window.innerWidth/2, my=window.innerHeight/2, retX=mx, retY=my, retOn=false;
  function interactive(t){ return !!(t && t.closest && t.closest("a, button, input, .node, .row")); }
  var onMove = function(e){ mx=e.clientX; my=e.clientY; if(!retOn){ retOn=true; reticle.classList.add("on"); } reticle.classList.toggle("locked", interactive(e.target)); };
  var onDown = function(){ reticle.classList.remove("pulse"); void reticle.offsetWidth; reticle.classList.add("pulse"); blip("ui"); };
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mousedown", onDown);

  function decode(elm, text){
    if(!elm) return; var pool="ABCDEF0123456789/#>_", frames=14, f=0;
    var iv=setInterval(function(){
      f++; var out="";
      for(var i=0;i<text.length;i++){ out += (i < text.length*(f/frames)) ? text[i] : pool[Math.floor(rnd()*pool.length)]; }
      elm.textContent=out;
      if(f>=frames){ clearInterval(iv); elm.textContent=text; }
    }, 26);
  }
  function fire(elm, cls){ if(!elm) return; elm.classList.remove(cls); void elm.offsetWidth; elm.classList.add(cls); }

  var crumbEl = document.querySelector(".crumb b");
  document.getElementById("nav").addEventListener("click", function(e){
    e.preventDefault(); var a = e.target.closest("a"); if(!a) return;
    var links=this.querySelectorAll("a"); for(var i=0;i<links.length;i++) links[i].classList.remove("active");
    a.classList.add("active");
    if(crumbEl) decode(crumbEl, a.textContent.trim());
    fire(navscanEl, "go"); blip("allow");
  });

  // ---------- render + intervals ----------
  renderOps(); renderApprovals(); renderChannels();
  for(var ib=0; ib<6; ib++) streamPolicy();
  for(var ic=0; ic<5; ic++) streamBroker();
  for(var id2=0; id2<6; id2++) streamAudit();

  var timers=[];
  function start(){
    timers.push(setInterval(streamPolicy, 1300));
    timers.push(setInterval(streamAudit, 2100));
    timers.push(setInterval(streamBroker, 1700));
    timers.push(setInterval(driftChannels, 1600));
    timers.push(setInterval(tickTargets, 1000));
    timers.push(setInterval(renderOps, 4200));
    timers.push(setInterval(function(){ if(rnd()<0.5) fire(glitchEl, "go"); }, 13000));
    timers.push(setInterval(function(){ if(rnd()<0.5 && approvals.length<7){ approvals.push(newApproval()); renderApprovals(); } }, 5200));
    timers.push(setInterval(function(){
      for(var i=0;i<approvals.length;i++){ approvals[i].exp -= 2; }
      approvals = approvals.filter(function(a){ if(a.exp<=0){ pushAudit("APPROVAL_EXPIRED", a.actor, a.id); return false;} return true; });
      renderApprovals();
    }, 2000));
    gaugeTgt=99.2;
  }

  // animation loop
  var last=0, sparkAcc=0;
  function frame(now){
    var t=now/1000, dt=last?Math.min(0.05,t-last):0.016; last=t;
    // ease tile numbers + push spark samples
    sparkAcc+=dt;
    for(var i=0;i<TILES.length;i++){
      var tl=TILES[i]; tl.val += (tl.tgt-tl.val)*Math.min(1,dt*4);
      tileEls[tl.id].num.textContent = tl.fmt(tl.val);
    }
    if(sparkAcc>0.7){
      sparkAcc=0;
      for(var j=0;j<TILES.length;j++){ var s=TILES[j].spark; s.push(0.2+ (TILES[j].val % 100)/125 + rnd()*0.3); if(s.length>40)s.shift(); }
    }
    for(var k=0;k<TILES.length;k++) drawSpark(TILES[k]);
    // deltas (static-ish labels)
    TILES.forEach(function(tl){ var d=tileEls[tl.id].delta; if(tl.id==="rel"){ d.className="delta up"; d.textContent="▲ nominal"; } else if(tl.id==="apr"){ d.className="delta down"; d.textContent="▼ triaging"; } else { d.className="delta up"; d.textContent="▲ "+(tl.id==="rev"?"+3.2%": tl.id==="dec"?"live":"active"); } });
    // gauge
    gaugeVal += (gaugeTgt-gaugeVal)*Math.min(1,dt*2);
    $("gaugeVal").innerHTML = gaugeVal.toFixed(1)+'<span style="font-size:14px">%</span>';
    drawGauge();
    // wave
    if(!reduce){ wave.push(0.35+Math.abs(Math.sin(t*2.1))*0.3+rnd()*0.2); if(wave.length>120)wave.shift(); }
    drawWave();
    // lifecycle flow bars
    for(var f=0; f<flows.length; f++){ flows[f].style.width = (30+ (Math.sin(t*1.2 + f)*0.5+0.5)*70) + "%"; }
    // targeting reticle follows the pointer with easing
    retX += (mx-retX)*Math.min(1,dt*16); retY += (my-retY)*Math.min(1,dt*16);
    reticle.style.transform = "translate("+retX+"px,"+retY+"px)";
    rafId = requestAnimationFrame(frame);
  }
  // init spark baseline vals
  TILES.forEach(function(t){ t.val0raw=t.val; });
  rafId = requestAnimationFrame(frame);

  // ---------- boot ----------
  var BOOTLOG = [
    ["control plane · authenticating operator","ok"],
    ["tenant context · RLS forced · fail-closed","ok"],
    ["policy bundle · commerce-policy-1.4.0 · immutable","ok"],
    ["tool broker · credential isolation verified","ok"],
    ["audit chain · digest continuity confirmed","ok"],
    ["realtime · streaming operational telemetry","ok"]
  ];
  (function(){
    var log=$("bootlog");
    BOOTLOG.forEach(function(l){ var d=el("div", l[1]); d.innerHTML="› "+l[0]+' <span class="ok">['+l[1].toUpperCase()+']</span>'; log.appendChild(d); });
    var lines=log.children, i=0;
    bootIv=setInterval(function(){ if(i<lines.length){ lines[i].classList.add("show"); i++; } else clearInterval(bootIv); }, 240);
  })();

  function dismiss(){ $("boot").classList.add("gone"); start(); }
  $("enterSound").addEventListener("click", function(){ initAudio(); if(audio&&audio.state==="suspended")audio.resume(); setMuted(false); dismiss(); });
  $("enterSilent").addEventListener("click", dismiss);
  $("soundBtn").addEventListener("click", function(){ if(!audioReady){ initAudio(); if(audio&&audio.state==="suspended")audio.resume(); setMuted(false); return;} if(audio&&audio.state==="suspended")audio.resume(); setMuted(!muted); });

  return function cleanup(){
    cancelAnimationFrame(rafId);
    clearInterval(clockIv); clearInterval(bootIv);
    timers.forEach(function(t){ clearInterval(t); });
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mousedown', onDown);
    try { if (audio) audio.close(); } catch (e) {}
    document.body.style.overflow = prevOverflow;
  };
}
