/* Home-page hero: schematic sagittal mouse brain with inputs to the nucleus
   accumbens. Spikes travel along glutamate (green) and dopamine (blue) fibres;
   hovering or tapping a region "stimulates" it and shows what the lab found.
   Illustrative only: positions are approximate and activity is random. */
(function () {
  "use strict";

  function safeJSON(s) { try { return JSON.parse(s || "{}"); } catch (e) { return {}; } }

  document.querySelectorAll("[data-circuit]").forEach(init);

  function init(root) {
  var canvas = root.querySelector("canvas");
  var ctx = canvas.getContext("2d");
  var readout = root.querySelector("[data-readout]");
  var labels = safeJSON(root.getAttribute("data-labels"));
  var findings = safeJSON(root.getAttribute("data-findings"));
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(pointer: coarse)").matches;
  if (coarse && readout) readout.textContent = readout.getAttribute("data-hint-touch");

  // Brain outline, anterior to the left (x, y in a 1.75 : 1 box)
  var OUTLINE = [
    [0.03, 0.50], [0.06, 0.40], [0.12, 0.36], [0.17, 0.37],
    [0.20, 0.27], [0.28, 0.17], [0.40, 0.11], [0.53, 0.10], [0.65, 0.13], [0.74, 0.19],
    [0.79, 0.22], [0.86, 0.24], [0.93, 0.31], [0.97, 0.42], [0.96, 0.55], [0.90, 0.64],
    [0.83, 0.69], [0.80, 0.78], [0.72, 0.84],
    [0.60, 0.88], [0.47, 0.88], [0.35, 0.84], [0.25, 0.76], [0.19, 0.68],
    [0.13, 0.64], [0.07, 0.60]
  ];
  var INNER = [
    [[0.16, 0.38], [0.17, 0.50], [0.16, 0.62]],                  // olfactory bulb boundary
    [[0.25, 0.40], [0.40, 0.29], [0.56, 0.30], [0.66, 0.38]],    // corpus callosum
    [[0.77, 0.22], [0.76, 0.40], [0.80, 0.56], [0.86, 0.66]],    // cerebellum boundary
    [[0.56, 0.36], [0.66, 0.42], [0.70, 0.54], [0.66, 0.64]]     // hippocampus
  ];

  var NAC = { id: "nac", abbr: "NAc", x: 0.275, y: 0.615, lx: -0.01, ly: 0.105, anchor: "center" };
  var SOURCES = [
    { id: "pfc", abbr: "PFC", x: 0.215, y: 0.33, lx: -0.005, ly: -0.055, anchor: "center", da: false,
      c1: [0.20, 0.45], c2: [0.25, 0.52], n: 12 },
    { id: "pvt", abbr: "PVT", x: 0.50, y: 0.44, lx: 0.0, ly: -0.05, anchor: "center", da: false,
      c1: [0.43, 0.43], c2: [0.34, 0.53], n: 12 },
    { id: "vhpc", abbr: "vHPC", x: 0.675, y: 0.585, lx: 0.045, ly: 0.012, anchor: "left", da: false,
      c1: [0.60, 0.47], c2: [0.38, 0.49], n: 16 },
    { id: "bla", abbr: "BLA", x: 0.47, y: 0.705, lx: 0.0, ly: 0.07, anchor: "center", da: false,
      c1: [0.40, 0.75], c2: [0.33, 0.70], n: 13 },
    { id: "vta", abbr: "VTA", x: 0.615, y: 0.775, lx: 0.04, ly: 0.04, anchor: "left", da: true,
      c1: [0.52, 0.84], c2: [0.36, 0.75], n: 11 }
  ];

  var GREEN = [52, 210, 124], BLUE = [111, 139, 255], INK = [233, 236, 239];
  var W = 0, H = 0, dpr = 1, box = { x: 0, y: 0, w: 1, h: 1 };
  var fibers = [], neurons = [], spikes = [];
  var hovered = null, pinned = null, pointer = null;
  var staticLayer = document.createElement("canvas");
  var sctx = staticLayer.getContext("2d");
  var running = false, visible = true, last = 0, da = 0;
  var rand = mulberry32(7);

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function P(nx, ny) { return [box.x + nx * box.w, box.y + ny * box.h]; }
  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

  function layout() {
    var r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(r.width * dpr));
    H = Math.max(1, Math.round(r.height * dpr));
    canvas.width = W; canvas.height = H;
    staticLayer.width = W; staticLayer.height = H;
    var padT = 46 * dpr, padB = 70 * dpr, padX = 18 * dpr;
    var aw = W - padX * 2, ah = H - padT - padB;
    // Zoom past the panel edges, like a microscope field centred on the circuit
    var bw = Math.min(aw * 1.34, ah * 1.75), bh = bw / 1.75;
    box = { x: W / 2 - 0.47 * bw, y: padT + (ah - bh) / 2, w: bw, h: bh };
    build();
    drawStatic();
  }

  function cubic(p0, p1, p2, p3, t) {
    var u = 1 - t;
    return [
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
    ];
  }

  function build() {
    rand = mulberry32(7);
    fibers = [];
    SOURCES.forEach(function (s) {
      for (var i = 0; i < s.n; i++) {
        var a = rand() * Math.PI * 2, rr = Math.sqrt(rand());
        var start = P(s.x + Math.cos(a) * 0.022 * rr, s.y + Math.sin(a) * 0.03 * rr);
        var b = rand() * Math.PI * 2, rb = Math.sqrt(rand());
        var end = P(NAC.x + Math.cos(b) * 0.05 * rb, NAC.y + Math.sin(b) * 0.06 * rb);
        var j = function () { return (rand() - 0.5) * 0.05; };
        var c1 = P(s.c1[0] + j(), s.c1[1] + j()), c2 = P(s.c2[0] + j(), s.c2[1] + j());
        var pts = [];
        for (var k = 0; k <= 48; k++) pts.push(cubic(start, c1, c2, end, k / 48));
        fibers.push({ src: s, pts: pts, end: end });
      }
    });
    neurons = [];
    for (var n = 0; n < 110; n++) {
      var t = rand() * Math.PI * 2, r = Math.sqrt(rand());
      var p = P(NAC.x + Math.cos(t) * 0.062 * r, NAC.y + Math.sin(t) * 0.075 * r);
      neurons.push({ x: p[0], y: p[1], a: 0, d: rand() < 0.5 ? 1 : 2 });
    }
  }

  function smoothClosed(c, pts) {
    var n = pts.length;
    c.beginPath();
    for (var i = 0; i < n; i++) {
      var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      if (i === 0) c.moveTo(p1[0], p1[1]);
      c.bezierCurveTo(
        p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
        p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
        p2[0], p2[1]);
    }
    c.closePath();
  }
  function smoothOpen(c, pts) {
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      c.bezierCurveTo(
        p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
        p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
        p2[0], p2[1]);
    }
  }

  function active() { return pinned || hovered; }

  function drawStatic() {
    var c = sctx;
    c.clearRect(0, 0, W, H);
    // Outline and landmarks
    smoothClosed(c, OUTLINE.map(function (q) { return P(q[0], q[1]); }));
    c.fillStyle = "rgba(233,236,239,0.025)";
    c.fill();
    c.lineWidth = 1.1 * dpr;
    c.strokeStyle = "rgba(233,236,239,0.32)";
    c.stroke();
    c.lineWidth = 1 * dpr;
    c.strokeStyle = "rgba(233,236,239,0.10)";
    c.setLineDash([3 * dpr, 4 * dpr]);
    INNER.forEach(function (line) { smoothOpen(c, line.map(function (q) { return P(q[0], q[1]); })); c.stroke(); });
    c.setLineDash([]);

    // Fibres
    var act = active();
    c.globalCompositeOperation = "lighter";
    fibers.forEach(function (f) {
      var on = act && act.id === f.src.id;
      var dim = act && !on;
      c.beginPath();
      c.moveTo(f.pts[0][0], f.pts[0][1]);
      for (var i = 1; i < f.pts.length; i++) c.lineTo(f.pts[i][0], f.pts[i][1]);
      c.strokeStyle = rgba(f.src.da ? BLUE : GREEN, on ? 0.34 : dim ? 0.05 : 0.11);
      c.lineWidth = (on ? 1.3 : 1) * dpr;
      c.stroke();
    });
    c.globalCompositeOperation = "source-over";

    // NAc boundary
    var nc = P(NAC.x, NAC.y);
    c.beginPath();
    c.ellipse(nc[0], nc[1], 0.075 * box.w, 0.09 * box.h, -0.2, 0, Math.PI * 2);
    c.strokeStyle = "rgba(233,236,239,0.22)";
    c.setLineDash([2 * dpr, 3 * dpr]);
    c.stroke();
    c.setLineDash([]);

    // Region nodes and labels
    c.font = (10.5 * dpr) + "px 'Geist Mono', ui-monospace, monospace";
    c.textBaseline = "middle";
    SOURCES.concat([NAC]).forEach(function (s) {
      var p = P(s.x, s.y);
      var on = act && act.id === s.id;
      if (s !== NAC) {
        c.beginPath();
        c.arc(p[0], p[1], (on ? 5 : 3.2) * dpr, 0, Math.PI * 2);
        c.fillStyle = on ? rgba(s.da ? BLUE : GREEN, 1) : "rgba(233,236,239,0.85)";
        c.fill();
        c.beginPath();
        c.arc(p[0], p[1], (on ? 11 : 8) * dpr, 0, Math.PI * 2);
        c.strokeStyle = on ? rgba(s.da ? BLUE : GREEN, 0.7) : "rgba(233,236,239,0.25)";
        c.lineWidth = 1 * dpr;
        c.stroke();
      }
      var lp = P(s.x + s.lx, s.y + s.ly);
      c.textAlign = s.anchor;
      var txt = on && labels[s.id] ? labels[s.id] : s.abbr;
      c.fillStyle = on ? "rgba(233,236,239,1)" : s === NAC ? "rgba(233,236,239,0.85)" : "rgba(233,236,239,0.6)";
      c.fillText(txt, lp[0], lp[1]);
    });
  }

  function rate(s, t) {
    var act = active();
    if (act && act.id === s.id) return 16;
    var base = s.da ? 1.6 : 2.4;
    return base * (0.55 + 0.45 * Math.sin(t / 1300 + s.x * 9) * Math.sin(t / 2300 + s.y * 7) + 0.45);
  }

  function emit(t, dt) {
    SOURCES.forEach(function (s) {
      var expected = rate(s, t) * dt / 1000;
      while (expected > 0) {
        if (Math.random() < Math.min(expected, 1)) {
          var pool = fibers.filter(function (f) { return f.src === s; });
          var f = pool[(Math.random() * pool.length) | 0];
          spikes.push({ f: f, t: 0, v: 0.55 + Math.random() * 0.35, da: s.da });
        }
        expected -= 1;
      }
    });
  }

  function at(f, t) {
    var x = t * (f.pts.length - 1), i = Math.min(f.pts.length - 2, Math.floor(x)), u = x - i;
    var a = f.pts[i], b = f.pts[i + 1];
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  }

  function arrive(sp) {
    var e = sp.f.end;
    if (sp.da) { da = Math.min(1, da + 0.16); }
    for (var k = 0; k < 4; k++) {
      var best = null, bd = Infinity;
      for (var j = 0; j < 6; j++) {
        var n = neurons[(Math.random() * neurons.length) | 0];
        var d = (n.x - e[0]) * (n.x - e[0]) + (n.y - e[1]) * (n.y - e[1]);
        if (d < bd) { bd = d; best = n; }
      }
      best.a = Math.min(1, best.a + (sp.da ? 0.25 : 0.55));
    }
  }

  function frame(now) {
    if (!running) return;
    var dt = last ? Math.min(64, now - last) : 16;
    last = now;
    emit(now, dt);

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(staticLayer, 0, 0);

    // Optogenetic light at the stimulated region
    var act = active();
    if (act) {
      var ap = P(act.x, act.y);
      var g = ctx.createRadialGradient(ap[0], ap[1], 0, ap[0], ap[1], 48 * dpr);
      g.addColorStop(0, "rgba(90,130,255,0.40)");
      g.addColorStop(1, "rgba(90,130,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(ap[0], ap[1], 48 * dpr, 0, Math.PI * 2); ctx.fill();
    }

    // Dopamine wash over the accumbens
    da *= Math.pow(0.5, dt / 900);
    if (da > 0.01) {
      var nc = P(NAC.x, NAC.y);
      var gw = ctx.createRadialGradient(nc[0], nc[1], 0, nc[0], nc[1], 0.1 * box.w);
      gw.addColorStop(0, rgba(BLUE, 0.22 * da));
      gw.addColorStop(1, rgba(BLUE, 0));
      ctx.fillStyle = gw;
      ctx.beginPath(); ctx.arc(nc[0], nc[1], 0.1 * box.w, 0, Math.PI * 2); ctx.fill();
    }

    // Spikes
    ctx.globalCompositeOperation = "lighter";
    for (var i = spikes.length - 1; i >= 0; i--) {
      var sp = spikes[i];
      sp.t += sp.v * dt / 1000;
      if (sp.t >= 1) { arrive(sp); spikes.splice(i, 1); continue; }
      var col = sp.da ? BLUE : GREEN;
      ctx.lineWidth = 1.6 * dpr;
      ctx.lineCap = "round";
      var prev = at(sp.f, Math.max(0, sp.t - 0.09));
      for (var k = 1; k <= 6; k++) {
        var p = at(sp.f, Math.max(0, sp.t - 0.09 + k * 0.015));
        ctx.strokeStyle = rgba(col, 0.1 + k * 0.1);
        ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
        prev = p;
      }
      var h = at(sp.f, sp.t);
      ctx.fillStyle = rgba(col, 0.25);
      ctx.beginPath(); ctx.arc(h[0], h[1], 4.2 * dpr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(240,255,246,0.95)";
      ctx.beginPath(); ctx.arc(h[0], h[1], 1.4 * dpr, 0, Math.PI * 2); ctx.fill();
    }

    // Accumbens neurons
    var decay = Math.pow(0.5, dt / 260);
    for (var n = 0; n < neurons.length; n++) {
      var nr = neurons[n];
      nr.a *= decay;
      var r = (1.2 + nr.a * 2.6) * dpr;
      if (nr.a > 0.25) {
        ctx.fillStyle = rgba(GREEN, nr.a * 0.28);
        ctx.beginPath(); ctx.arc(nr.x, nr.y, r * 3, 0, Math.PI * 2); ctx.fill();
      }
      var mix = nr.a;
      var cr = Math.round(INK[0] * (1 - mix) * 0.55 + GREEN[0] * mix + BLUE[0] * da * 0.3);
      var cg = Math.round(INK[1] * (1 - mix) * 0.55 + GREEN[1] * mix + BLUE[1] * da * 0.3);
      var cb = Math.round(INK[2] * (1 - mix) * 0.55 + GREEN[2] * mix + BLUE[2] * da * 0.5);
      ctx.fillStyle = "rgba(" + Math.min(255, cr) + "," + Math.min(255, cg) + "," + Math.min(255, cb) + "," + (0.55 + mix * 0.45) + ")";
      ctx.beginPath(); ctx.arc(nr.x, nr.y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";

    requestAnimationFrame(frame);
  }

  function drawOnce() {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(staticLayer, 0, 0);
    ctx.globalCompositeOperation = "lighter";
    neurons.forEach(function (n) {
      ctx.fillStyle = "rgba(170,190,180,0.6)";
      ctx.beginPath(); ctx.arc(n.x, n.y, 1.3 * dpr, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalCompositeOperation = "source-over";
  }

  function start() {
    if (reduceMotion) { drawOnce(); return; }
    if (running || !visible || document.hidden) return;
    running = true; last = 0;
    requestAnimationFrame(frame);
  }
  function stop() { running = false; }

  function nearest(ev) {
    var r = canvas.getBoundingClientRect();
    var x = (ev.clientX - r.left) * dpr, y = (ev.clientY - r.top) * dpr;
    var best = null, bd = Infinity;
    SOURCES.forEach(function (s) {
      var p = P(s.x, s.y);
      var d = Math.hypot(p[0] - x, p[1] - y);
      if (d < bd) { bd = d; best = s; }
    });
    return bd < Math.max(46 * dpr, box.w * 0.075) ? best : null;
  }

  function setActive(s) {
    drawStatic();
    if (reduceMotion) drawOnce();
    if (!readout) return;
    if (s) {
      readout.innerHTML = "";
      var b = document.createElement("b");
      b.textContent = labels[s.id] || s.abbr;
      readout.appendChild(b);
      readout.appendChild(document.createTextNode(findings[s.id] || ""));
    } else {
      readout.textContent = readout.getAttribute(coarse ? "data-hint-touch" : "data-hint");
    }
  }

  canvas.addEventListener("pointermove", function (ev) {
    if (ev.pointerType === "touch") return;
    var s = nearest(ev);
    if (s !== hovered) { hovered = s; if (!pinned) setActive(s); }
    canvas.style.cursor = s ? "pointer" : "default";
  });
  canvas.addEventListener("pointerleave", function () {
    if (hovered) { hovered = null; if (!pinned) setActive(null); }
  });
  canvas.addEventListener("click", function (ev) {
    var s = nearest(ev);
    pin(s && pinned !== s ? s : null);
  });

  // Optional region buttons in the same card (gallery explainer)
  var card = root.closest(".viz");
  var buttons = card ? card.querySelectorAll("[data-region]") : [];
  function pin(s) {
    pinned = s;
    setActive(pinned || hovered);
    Array.prototype.forEach.call(buttons, function (b) {
      b.setAttribute("aria-pressed", s && b.getAttribute("data-region") === s.id ? "true" : "false");
    });
  }
  Array.prototype.forEach.call(buttons, function (b) {
    b.addEventListener("click", function () {
      var id = b.getAttribute("data-region");
      var s = SOURCES.filter(function (x) { return x.id === id; })[0];
      pin(pinned === s ? null : s);
    });
  });

  var ro = window.ResizeObserver ? new ResizeObserver(function () { layout(); if (reduceMotion || !running) drawOnce(); }) : null;
  if (ro) ro.observe(root); else window.addEventListener("resize", layout);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start(); else stop();
    }).observe(root);
  }
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });

  layout();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { drawStatic(); if (reduceMotion) drawOnce(); });
  start();
  }
})();
