// ORYQON Operations Theater — WebGL scene engine. Framework-agnostic; call
// startTheater() after the markup is mounted; it returns a cleanup function.
export function startTheater() {
  "use strict";
  var rafId = 0, hudInterval = 0;
  var prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var glc = document.getElementById("scene");
  var ov = document.getElementById("overlay");
  var octx = ov.getContext("2d");
  var gl = glc.getContext("webgl", { alpha: false, antialias: true, premultipliedAlpha: false })
        || glc.getContext("experimental-webgl", { alpha: false });

  var W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    glc.width = Math.round(W * DPR); glc.height = Math.round(H * DPR);
    ov.width = Math.round(W * DPR); ov.height = Math.round(H * DPR);
    octx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (gl) gl.viewport(0, 0, glc.width, glc.height);
  }
  window.addEventListener("resize", resize);
  resize();

  // ---------- PRNG ----------
  var seed = 0x51ed270b;
  function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; }
  function range(a, b) { return a + (b - a) * rnd(); }

  // ---------- mat4 (column-major) ----------
  function mul(a, b) {
    var o = new Float32Array(16), c, r, k, s;
    for (c = 0; c < 4; c++) for (r = 0; r < 4; r++) {
      s = 0; for (k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
    return o;
  }
  function perspective(fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0
    ]);
  }
  function transZ(z) { return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,z,1]); }
  function rotX(a) { var c=Math.cos(a), s=Math.sin(a); return new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]); }
  function rotY(a) { var c=Math.cos(a), s=Math.sin(a); return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]); }
  function project(m, x, y, z) {
    var w = m[3]*x + m[7]*y + m[11]*z + m[15];
    var px = m[0]*x + m[4]*y + m[8]*z + m[12];
    var py = m[1]*x + m[5]*y + m[9]*z + m[13];
    return [px, py, w];
  }

  // ---------- geometry helpers ----------
  function sph(lat, lon, r) {
    var cl = Math.cos(lat);
    return [r * cl * Math.cos(lon), r * Math.sin(lat), r * cl * Math.sin(lon)];
  }

  // ---------- data ----------
  var NODES = reduce ? 1100 : 2200;
  var STARS = reduce ? 600 : 1400;
  var NP = window.innerWidth < 640 ? 10 : 16;
  var NU = window.innerWidth < 640 ? 5 : 9;

  // static globe nodes (fibonacci sphere) + colors + sizes
  var nodePos = new Float32Array(NODES * 3);
  var nodeCol = new Float32Array(NODES * 4);
  var nodeSize = new Float32Array(NODES);
  (function () {
    var ga = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < NODES; i++) {
      var yy = 1 - (i / (NODES - 1)) * 2;
      var rr = Math.sqrt(1 - yy * yy);
      var th = ga * i;
      var x = Math.cos(th) * rr, z = Math.sin(th) * rr;
      nodePos[i*3] = x; nodePos[i*3+1] = yy; nodePos[i*3+2] = z;
      var hot = rnd();
      var bright = 0.28 + hot * hot * 0.5;
      nodeCol[i*4] = 0.16 * bright * 2;
      nodeCol[i*4+1] = 0.5 * bright;
      nodeCol[i*4+2] = 0.72 * bright;
      nodeCol[i*4+3] = 0.5 + hot * 0.3;
      nodeSize[i] = 1.4 + hot * hot * 3.2;
    }
  })();

  // stars (outer shell)
  var starPos = new Float32Array(STARS * 3);
  var starCol = new Float32Array(STARS * 4);
  var starSize = new Float32Array(STARS);
  (function () {
    for (var i = 0; i < STARS; i++) {
      var u = rnd() * 2 - 1, t = rnd() * Math.PI * 2, s = Math.sqrt(1 - u*u);
      var rr = range(3.2, 7);
      starPos[i*3] = s*Math.cos(t)*rr; starPos[i*3+1] = u*rr; starPos[i*3+2] = s*Math.sin(t)*rr;
      var b = range(0.12, 0.5);
      starCol[i*4]=b*0.8; starCol[i*4+1]=b*0.9; starCol[i*4+2]=b; starCol[i*4+3]=range(0.3,0.8);
      starSize[i] = range(0.8, 1.8);
    }
  })();

  // graticule (lat/long lines)
  var gratArr = [];
  (function () {
    var latN = 7, lonN = 12, seg = 60, i, j, a, p;
    for (i = 1; i < latN; i++) {
      var lat = -Math.PI/2 + Math.PI * i / latN;
      for (j = 0; j < seg; j++) {
        for (var e = 0; e < 2; e++) {
          a = ((j + e) / seg) * Math.PI * 2;
          p = sph(lat, a, 1.001);
          gratArr.push(p[0], p[1], p[2], 0.26, 0.5, 0.62, 0.10);
        }
      }
    }
    for (i = 0; i < lonN; i++) {
      var lon = (i / lonN) * Math.PI * 2;
      for (j = 0; j < seg; j++) {
        for (var e2 = 0; e2 < 2; e2++) {
          a = -Math.PI/2 + Math.PI * ((j + e2) / seg);
          p = sph(a, lon, 1.001);
          gratArr.push(p[0], p[1], p[2], 0.26, 0.5, 0.62, 0.09);
        }
      }
    }
  })();
  var gratData = new Float32Array(gratArr);
  var gratCount = gratData.length / 7;

  // contacts (personnel + autonomous units) drifting on the surface
  var contacts = [];
  function makeContact(kind) {
    return {
      kind: kind,
      lat: range(-1.2, 1.2),
      lon: range(0, Math.PI * 2),
      dlon: range(0.02, 0.06) * (rnd() < 0.5 ? 1 : -1),
      dlat: range(-0.015, 0.015),
      lit: 0, side: 0, alert: 0, ping: 0,
      tag: (kind === "unit" ? "U-" : "P-") + String(1 + Math.floor(rnd()*90)).padStart(2, "0"),
      tracked: rnd() < 0.28
    };
  }
  var i;
  for (i = 0; i < NP; i++) contacts.push(makeContact("person"));
  for (i = 0; i < NU; i++) contacts.push(makeContact("unit"));

  // arcs (coordination in flight)
  var arcs = [];
  function spawnArc() {
    if (arcs.length > 30) return;
    var a = contacts[Math.floor(rnd()*contacts.length)];
    var b = contacts[Math.floor(rnd()*contacts.length)];
    if (a === b) return;
    arcs.push({ a: a, b: b, t: 0, speed: range(0.3, 0.7), life: 1, hue: rnd() < 0.5 });
  }

  // ---------- webgl program ----------
  var prog, aPos, aCol, aSize, uMVP, uScale, uPoint, glOK = false;
  function compile(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  if (gl) {
    var vs = compile(gl.VERTEX_SHADER,
      "attribute vec3 aPos; attribute vec4 aCol; attribute float aSize;" +
      "uniform mat4 uMVP; uniform float uScale;" +
      "varying vec4 vCol;" +
      "void main(){ vec4 p = uMVP * vec4(aPos,1.0); gl_Position = p;" +
      "gl_PointSize = clamp(aSize * uScale / max(p.w,0.1), 1.0, 60.0); vCol = aCol; }");
    var fs = compile(gl.FRAGMENT_SHADER,
      "precision mediump float; varying vec4 vCol; uniform float uPoint;" +
      "void main(){ float a = 1.0;" +
      "if(uPoint > 0.5){ vec2 d = gl_PointCoord - vec2(0.5); float r = length(d);" +
      "a = smoothstep(0.5, 0.0, r); a = a*a; }" +
      "gl_FragColor = vec4(vCol.rgb * vCol.a * a, 1.0); }");
    if (vs && fs) {
      prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
      if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        glOK = true;
        aPos = gl.getAttribLocation(prog, "aPos");
        aCol = gl.getAttribLocation(prog, "aCol");
        aSize = gl.getAttribLocation(prog, "aSize");
        uMVP = gl.getUniformLocation(prog, "uMVP");
        uScale = gl.getUniformLocation(prog, "uScale");
        uPoint = gl.getUniformLocation(prog, "uPoint");
      } else { console.error(gl.getProgramInfoLog(prog)); }
    }
  }

  // buffers
  var bufP = glOK ? gl.createBuffer() : null;   // interleaved dynamic (points)
  var bufL = glOK ? gl.createBuffer() : null;   // interleaved dynamic (lines)
  var bufStat = glOK ? gl.createBuffer() : null; // static nodes
  var bufGrat = glOK ? gl.createBuffer() : null; // static graticule
  var bufStar = glOK ? gl.createBuffer() : null; // static stars

  // build static interleaved [x,y,z, r,g,b,a, size] for nodes & stars
  function interleavePoints(pos, col, size, n) {
    var out = new Float32Array(n * 8);
    for (var i = 0; i < n; i++) {
      out[i*8] = pos[i*3]; out[i*8+1] = pos[i*3+1]; out[i*8+2] = pos[i*3+2];
      out[i*8+3] = col[i*4]; out[i*8+4] = col[i*4+1]; out[i*8+5] = col[i*4+2]; out[i*8+6] = col[i*4+3];
      out[i*8+7] = size[i];
    }
    return out;
  }
  if (glOK) {
    gl.bindBuffer(gl.ARRAY_BUFFER, bufStat);
    gl.bufferData(gl.ARRAY_BUFFER, interleavePoints(nodePos, nodeCol, nodeSize, NODES), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufStar);
    gl.bufferData(gl.ARRAY_BUFFER, interleavePoints(starPos, starCol, starSize, STARS), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufGrat);
    gl.bufferData(gl.ARRAY_BUFFER, gratData, gl.STATIC_DRAW);
  }

  function drawPoints(buffer, count, stride8) {
    // stride8: true = 8-float stride (has size); false = 7-float (line, no size)
    var stride = stride8 ? 32 : 28;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aCol); gl.vertexAttribPointer(aCol, 4, gl.FLOAT, false, stride, 12);
    if (stride8) { gl.enableVertexAttribArray(aSize); gl.vertexAttribPointer(aSize, 1, gl.FLOAT, false, stride, 28); }
    else { gl.disableVertexAttribArray(aSize); gl.vertexAttrib1f(aSize, 2.0); }
  }

  // ---------- audio ----------
  var audio=null, master=null, muted=true, audioReady=false, pingBus=null;
  var SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
  var nextBell = 0;

  function initAudio() {
    if (audioReady) return;
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    audio = new AC();
    master = audio.createGain(); master.gain.value = 0;
    var comp = audio.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4;
    master.connect(comp); comp.connect(audio.destination);

    // sub + drone bed
    var bed = audio.createGain(); bed.gain.value = 0.5;
    var lp = audio.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=430; lp.Q.value=0.7;
    bed.connect(lp); lp.connect(master);
    [{f:41.2,t:"sine",g:0.5},{f:55,t:"triangle",g:0.26},{f:55.4,t:"triangle",g:0.24},{f:82.4,t:"sine",g:0.14}].forEach(function(o){
      var osc=audio.createOscillator(); osc.type=o.t; osc.frequency.value=o.f;
      var g=audio.createGain(); g.gain.value=o.g; osc.connect(g); g.connect(bed); osc.start();
    });
    var lfo=audio.createOscillator(); lfo.type="sine"; lfo.frequency.value=0.045;
    var lg=audio.createGain(); lg.gain.value=150; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();

    // pad
    var pad=audio.createGain(); pad.gain.value=0.03;
    var plp=audio.createBiquadFilter(); plp.type="lowpass"; plp.frequency.value=1500;
    pad.connect(plp); plp.connect(master);
    [220,277.18,329.63].forEach(function(f){ var o=audio.createOscillator();o.type="sine";o.frequency.value=f;
      var g=audio.createGain();g.gain.value=0.3;o.connect(g);g.connect(pad);o.start(); });
    var trem=audio.createOscillator();trem.type="sine";trem.frequency.value=0.07;
    var tg=audio.createGain();tg.gain.value=0.018;trem.connect(tg);tg.connect(pad.gain);trem.start();

    // ping/bell bus with feedback delay (reverb feel)
    pingBus=audio.createGain(); pingBus.gain.value=0.5;
    var dly=audio.createDelay(); dly.delayTime.value=0.33;
    var fb=audio.createGain(); fb.gain.value=0.38;
    var dlp=audio.createBiquadFilter(); dlp.type="lowpass"; dlp.frequency.value=2400;
    pingBus.connect(master); pingBus.connect(dly); dly.connect(dlp); dlp.connect(fb); fb.connect(dly); dlp.connect(master);

    audioReady=true;
    nextBell = audio.currentTime + 1.5;
  }
  function tone(freq, vol, dur, type, bus) {
    if (!audioReady || muted) return;
    var t = audio.currentTime;
    var o = audio.createOscillator(); o.type = type || "sine"; o.frequency.value = freq;
    var g = audio.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || pingBus); o.start(t); o.stop(t + dur + 0.05);
  }
  function playPing(freq) { tone(freq, 0.05, 0.7, "sine"); }
  function playBell(freq) { tone(freq, 0.05, 2.4, "sine"); tone(freq * 2.01, 0.018, 1.6, "sine"); }
  function playAlert() {
    tone(146.83, 0.08, 1.4, "triangle", master);
    setTimeout(function(){ tone(138.59, 0.06, 1.6, "triangle", master); }, 180);
    setTimeout(function(){ tone(174.61, 0.05, 2.0, "sine"); }, 900);
  }
  function setMuted(m) {
    muted = m;
    var btn = document.getElementById("soundBtn");
    btn.classList.toggle("muted", m); btn.setAttribute("aria-pressed", String(!m));
    document.getElementById("soundLabel").textContent = m ? "Sound off" : "Sound on";
    if (audioReady) { var t = audio.currentTime; master.gain.cancelScheduledValues(t); master.gain.setTargetAtTime(m ? 0 : 0.55, t, 0.4); }
  }

  // ---------- state ----------
  var yaw = 0, pitch = -0.42, dolly = 3.4, sweepPhi = 0;
  var SWEEP_SPEED = reduce ? 0.12 : 0.32;
  var YAW_SPEED = reduce ? 0.02 : 0.055;
  var arcTimer = 0, alertTimer = range(8, 16), thru = 0;
  var alertActive = null, alertT = 0;
  var statusEl = document.getElementById("status");
  var bannerEl = document.getElementById("alertBanner");
  var SECTORS = ["EMEA-3","NA-11","APAC-7","LATAM-2","SEA-5","EU-9"];

  // scratch dynamic arrays
  var pointArr = new Float32Array((contacts.length + 260) * 8);
  var lineArr = new Float32Array(32 * 48 * 7);

  function contactPos(c, lift) { return sph(c.lat, c.lon, 1 + (lift || 0)); }

  function update(dt, t) {
    yaw += YAW_SPEED * dt;
    pitch = -0.42 + Math.sin(t * 0.05) * 0.08;
    dolly = 3.4 + Math.sin(t * 0.035) * 0.22;
    sweepPhi += SWEEP_SPEED * dt;
    if (sweepPhi > Math.PI * 2) sweepPhi -= Math.PI * 2;

    var n = [Math.cos(sweepPhi), 0, Math.sin(sweepPhi)];
    var c, i;
    for (i = 0; i < contacts.length; i++) {
      c = contacts[i];
      c.lon += c.dlon * dt; c.lat += c.dlat * dt;
      if (c.lat > 1.35 || c.lat < -1.35) c.dlat *= -1;
      c.lit *= 0.93; c.ping -= dt;
      if (c.alert > 0) c.alert -= dt;
      var p = contactPos(c, 0);
      var d = p[0]*n[0] + p[1]*n[1] + p[2]*n[2];
      var sgn = d >= 0 ? 1 : -1;
      if (c.side !== 0 && sgn !== c.side && Math.abs(d) < 0.12 && c.ping <= 0) {
        c.lit = 1; c.ping = 0.4;
        if (c.kind === "unit") { playPing(SCALE[2 + Math.floor(rnd()*4)]); thru += 3; }
        else thru += 1;
      }
      c.side = sgn;
    }

    arcTimer -= dt;
    if (arcTimer <= 0) { arcTimer = range(0.25, 0.7); spawnArc(); if (arcs.length) thru += 2; }
    for (i = arcs.length - 1; i >= 0; i--) {
      arcs[i].t += arcs[i].speed * dt;
      if (arcs[i].t >= 1) arcs.splice(i, 1);
    }

    // alerts
    alertTimer -= dt;
    if (!alertActive && alertTimer <= 0) {
      alertActive = contacts[Math.floor(rnd()*contacts.length)];
      alertActive.alert = 3.2; alertT = 3.2;
      statusEl.classList.add("alert");
      document.getElementById("stateText").textContent = "Anomaly — auto-triage";
      bannerEl.classList.add("show");
      document.getElementById("alertText").textContent = "Anomaly " + alertActive.tag + " · sector " + SECTORS[Math.floor(rnd()*SECTORS.length)] + " · auto-triaged";
      playAlert();
    }
    if (alertActive) {
      alertT -= dt;
      if (alertT <= 0) {
        alertActive = null; alertTimer = range(14, 26);
        statusEl.classList.remove("alert");
        document.getElementById("stateText").textContent = "System Nominal";
        bannerEl.classList.remove("show");
      }
    }

    // generative bells
    if (audioReady && !muted && audio.currentTime >= nextBell) {
      playBell(SCALE[Math.floor(rnd() * SCALE.length)]);
      nextBell = audio.currentTime + range(1.6, 4.2);
    }

    thru *= 0.96;
  }

  function buildDynamic(mvp) {
    // points: contacts + arc heads + sweep-ring points
    var pi = 0, c, i, p;
    function pushP(x,y,z,r,g,b,a,s){ pointArr[pi++]=x;pointArr[pi++]=y;pointArr[pi++]=z;pointArr[pi++]=r;pointArr[pi++]=g;pointArr[pi++]=b;pointArr[pi++]=a;pointArr[pi++]=s; }

    for (i = 0; i < contacts.length; i++) {
      c = contacts[i]; p = contactPos(c, 0.02);
      var lit = c.lit;
      if (c.kind === "unit") {
        pushP(p[0],p[1],p[2], 0.54,0.85,1.0, 0.85+lit*0.15, 6 + lit*10);
      } else {
        pushP(p[0],p[1],p[2], 0.95,0.93,0.85, 0.7+lit*0.3, 4.5 + lit*8);
      }
      if (c.alert > 0) {
        var ap = Math.sin(c.alert * 9) * 0.5 + 0.5;
        pushP(p[0],p[1],p[2], 0.95,0.72,0.36, 0.7*ap, 14 + ap*12);
      }
    }
    // sweep ring
    var n = [Math.cos(sweepPhi), 0, Math.sin(sweepPhi)];
    var up = [0,1,0];
    var u = [n[1]*up[2]-n[2]*up[1], n[2]*up[0]-n[0]*up[2], n[0]*up[1]-n[1]*up[0]];
    var ul = Math.hypot(u[0],u[1],u[2]) || 1; u=[u[0]/ul,u[1]/ul,u[2]/ul];
    var v = [n[1]*u[2]-n[2]*u[1], n[2]*u[0]-n[0]*u[2], n[0]*u[1]-n[1]*u[0]];
    var RINGN = 90;
    for (i = 0; i < RINGN; i++) {
      var th = (i / RINGN) * Math.PI * 2;
      var ct = Math.cos(th), st = Math.sin(th);
      var x = (u[0]*ct + v[0]*st)*1.01, y=(u[1]*ct+v[1]*st)*1.01, z=(u[2]*ct+v[2]*st)*1.01;
      var lead = Math.pow(Math.max(0, Math.cos(th)), 8);
      pushP(x,y,z, 0.6,0.9,1.0, 0.28 + lead*0.7, 2.5 + lead*7);
    }

    // lines: arcs (lifted bezier)
    var li = 0;
    function pushL(x,y,z,r,g,b,a){ lineArr[li++]=x;lineArr[li++]=y;lineArr[li++]=z;lineArr[li++]=r;lineArr[li++]=g;lineArr[li++]=b;lineArr[li++]=a; }
    var lineVerts = 0;
    for (i = 0; i < arcs.length; i++) {
      var ar = arcs[i];
      var A = contactPos(ar.a, 0.02), B = contactPos(ar.b, 0.02);
      var mid = [(A[0]+B[0])/2, (A[1]+B[1])/2, (A[2]+B[2])/2];
      var ml = Math.hypot(mid[0],mid[1],mid[2]) || 1;
      var lift = 1.25 + Math.hypot(A[0]-B[0],A[1]-B[1],A[2]-B[2]) * 0.35;
      mid = [mid[0]/ml*lift, mid[1]/ml*lift, mid[2]/ml*lift];
      var SEG = 22, prev = null;
      for (var s2 = 0; s2 <= SEG; s2++) {
        var tt = s2 / SEG, it = 1 - tt;
        var x = it*it*A[0] + 2*it*tt*mid[0] + tt*tt*B[0];
        var y = it*it*A[1] + 2*it*tt*mid[1] + tt*tt*B[1];
        var z = it*it*A[2] + 2*it*tt*mid[2] + tt*tt*B[2];
        var head = 1 - Math.min(1, Math.abs(tt - ar.t) * 6);
        var a = 0.05 + head * 0.6;
        var col = ar.hue ? [0.5,0.85,1.0] : [0.62,0.92,0.85];
        if (prev) { pushL(prev[0],prev[1],prev[2], col[0],col[1],col[2], prev[3]); pushL(x,y,z, col[0],col[1],col[2], a); lineVerts += 2; }
        prev = [x,y,z,a];
      }
    }
    return { pcount: pi/8, lverts: lineVerts, lfloats: li };
  }

  function render(t, mvp) {
    gl.clearColor(0.012, 0.016, 0.02, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.useProgram(prog);
    gl.uniformMatrix4fv(uMVP, false, mvp);
    gl.uniform1f(uScale, 3.0 * DPR);

    // stars
    gl.uniform1f(uPoint, 1.0);
    drawPoints(bufStar, STARS, true); gl.drawArrays(gl.POINTS, 0, STARS);

    // graticule (lines)
    gl.uniform1f(uPoint, 0.0);
    drawPoints(bufGrat, gratCount, false); gl.drawArrays(gl.LINES, 0, gratCount);

    // nodes
    gl.uniform1f(uPoint, 1.0);
    drawPoints(bufStat, NODES, true); gl.drawArrays(gl.POINTS, 0, NODES);

    // dynamic
    var d = buildDynamic(mvp);
    // arcs (lines)
    gl.uniform1f(uPoint, 0.0);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufL);
    gl.bufferData(gl.ARRAY_BUFFER, lineArr.subarray(0, d.lfloats), gl.DYNAMIC_DRAW);
    drawPoints(bufL, d.lverts, false); gl.drawArrays(gl.LINES, 0, d.lverts);
    // contacts + ring (points)
    gl.uniform1f(uPoint, 1.0);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufP);
    gl.bufferData(gl.ARRAY_BUFFER, pointArr.subarray(0, d.pcount * 8), gl.DYNAMIC_DRAW);
    drawPoints(bufP, d.pcount, true); gl.drawArrays(gl.POINTS, 0, d.pcount);
  }

  // overlay: tracked-contact callouts + alert ring
  function drawOverlay(mvp) {
    octx.clearRect(0, 0, W, H);
    var i, c, p, pr;
    for (i = 0; i < contacts.length; i++) {
      c = contacts[i];
      if (!c.tracked && c.alert <= 0) continue;
      p = contactPos(c, 0.02);
      pr = project(mvp, p[0], p[1], p[2]);
      if (pr[2] <= 0) continue;
      var sx = (pr[0]/pr[2] * 0.5 + 0.5) * W;
      var sy = (0.5 - pr[1]/pr[2] * 0.5) * H;
      if (c.alert > 0) {
        var ap = (3.2 - c.alert) ;
        var rad = 10 + (ap % 1) * 34;
        octx.beginPath(); octx.arc(sx, sy, rad, 0, 6.283);
        octx.strokeStyle = "rgba(241,184,91," + (0.6 * (1 - (ap % 1))) + ")"; octx.lineWidth = 1.5; octx.stroke();
        octx.beginPath(); octx.arc(sx, sy, 5, 0, 6.283); octx.strokeStyle = "rgba(241,184,91,0.9)"; octx.stroke();
      }
      if (c.tracked) {
        octx.strokeStyle = c.kind === "unit" ? "rgba(138,216,255,0.5)" : "rgba(244,245,242,0.4)";
        octx.lineWidth = 1;
        octx.beginPath(); octx.moveTo(sx + 8, sy - 8); octx.lineTo(sx + 18, sy - 18); octx.lineTo(sx + 46, sy - 18); octx.stroke();
        octx.font = "10px " + "ui-monospace, monospace";
        octx.fillStyle = c.kind === "unit" ? "rgba(138,216,255,0.85)" : "rgba(244,245,242,0.7)";
        octx.fillText(c.tag, sx + 21, sy - 21);
      }
    }
  }

  // fallback (no webgl): simple starfield so it's never blank
  function fallback(t) {
    octx.fillStyle = "#05070a"; octx.fillRect(0, 0, W, H);
    for (var i = 0; i < 220; i++) {
      var x = (i * 97.13 % W), y = ((i * 61.7 + t * 6) % H);
      octx.fillStyle = "rgba(138,216,255," + (0.1 + (i % 5) * 0.03) + ")";
      octx.fillRect(x, y, 1.4, 1.4);
    }
    octx.fillStyle = "rgba(244,245,242,0.5)"; octx.font = "13px ui-monospace, monospace";
    octx.fillText("WebGL unavailable — 2D fallback", 24, H - 24);
  }

  // HUD numbers
  var clockEl=document.getElementById("clock"), mP=document.getElementById("mPersonnel"),
      mU=document.getElementById("mUnits"), mL=document.getElementById("mLinks"),
      mT=document.getElementById("mThru"), mB=document.getElementById("mBearing");
  function updateHud() {
    var d = new Date(); function pad(n){return String(n).padStart(2,"0");}
    clockEl.textContent = pad(d.getUTCHours())+":"+pad(d.getUTCMinutes())+":"+pad(d.getUTCSeconds())+" UTC";
    var np=0,nu=0; for (var i=0;i<contacts.length;i++){ if(contacts[i].kind==="unit")nu++; else np++; }
    mP.textContent=np; mU.textContent=nu; mL.textContent=arcs.length;
    mT.textContent=Math.round(thru*10);
    var deg=Math.round(sweepPhi*180/Math.PI)%360; if(deg<0)deg+=360;
    mB.textContent=String(deg).padStart(3,"0")+"°";
  }
  hudInterval = setInterval(updateHud, 200); updateHud();

  var last = 0;
  function loop(now) {
    var t = now / 1000, dt = last ? Math.min(0.05, t - last) : 0.016; last = t;
    update(dt, t);
    if (glOK) {
      var mvp = mul(perspective(0.82, W / H, 0.1, 100), mul(transZ(-dolly), mul(rotX(pitch), rotY(yaw))));
      render(t, mvp);
      drawOverlay(mvp);
    } else {
      fallback(t);
    }
    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);

  // controls
  var startEl = document.getElementById("start");
  function dismiss(){ startEl.classList.add("gone"); }
  document.getElementById("enterSound").addEventListener("click", function(){
    initAudio(); if (audio && audio.state === "suspended") audio.resume(); setMuted(false); dismiss();
  });
  document.getElementById("enterSilent").addEventListener("click", dismiss);
  document.getElementById("soundBtn").addEventListener("click", function(){
    if (!audioReady) { initAudio(); if (audio && audio.state === "suspended") audio.resume(); setMuted(false); return; }
    if (audio && audio.state === "suspended") audio.resume();
    setMuted(!muted);
  });

  return function cleanup() {
    cancelAnimationFrame(rafId);
    clearInterval(hudInterval);
    window.removeEventListener("resize", resize);
    try { if (audio) audio.close(); } catch (e) {}
    document.body.style.overflow = prevOverflow;
  };
}
