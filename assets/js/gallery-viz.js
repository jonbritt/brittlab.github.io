/* Gallery visualizations, drawn only from published source data packed by
   tools/build_viz_data.py. Plain SVG/canvas, no libraries. Strings come from
   each card's data-i18n. */
(function () {
  "use strict";

  var SVGNS = "http://www.w3.org/2000/svg";
  var C = {
    ink: "#121315", ink2: "#474A50", ink3: "#66696F", rule: "rgba(18,19,21,0.12)", surface: "#FBFAF6",
    accent: "#3D5AFE", hyper: "#E0533F", hypo: "#3D5AFE",
    hit: "#2F8F5B", miss: "#D9A21E", fa: "#7A5AF0"
  };
  var lang = document.documentElement.lang || "en";
  var nf = function (x, d) { return Number(x).toLocaleString(lang === "fr" ? "fr-CA" : "en-CA", { minimumFractionDigits: d, maximumFractionDigits: d }); };
  var nInt = function (x) { return Number(x).toLocaleString(lang === "fr" ? "fr-CA" : "en-CA"); };

  function svg(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function html(tag, cls, parent, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function scale(d0, d1, r0, r1) {
    var f = function (v) { return r0 + (v - d0) / (d1 - d0) * (r1 - r0); };
    f.invert = function (p) { return d0 + (p - r0) / (r1 - r0) * (d1 - d0); };
    return f;
  }
  function tooltip(host) {
    var tip = html("div", "viz-tooltip", host);
    tip.setAttribute("role", "status");
    return {
      show: function (x, y, lines) {
        tip.innerHTML = "";
        lines.forEach(function (l, i) {
          var row = html("div", null, tip, l);
          if (i === 0) row.style.fontWeight = "500";
        });
        var w = host.clientWidth;
        tip.style.left = Math.max(70, Math.min(w - 70, x)) + "px";
        tip.style.top = y + "px";
        tip.classList.add("is-on");
      },
      hide: function () { tip.classList.remove("is-on"); }
    };
  }
  function i18n(card) { try { return JSON.parse(card.getAttribute("data-i18n") || "{}"); } catch (e) { return {}; } }
  function legend(parent, items) {
    var lg = html("div", "viz-legend", parent);
    items.forEach(function (it) {
      var s = html("span", null, lg);
      var sw = html("i", null, s);
      sw.style.background = it.color;
      if (it.round) sw.style.borderRadius = "50%";
      s.appendChild(document.createTextNode(it.label));
    });
    return lg;
  }
  function onResize(el, fn) {
    var w = el.clientWidth, timer;
    var cb = function () {
      if (el.clientWidth === w) return;
      w = el.clientWidth;
      clearTimeout(timer);
      timer = setTimeout(fn, 120);
    };
    if (window.ResizeObserver) new ResizeObserver(cb).observe(el);
    else window.addEventListener("resize", cb);
  }
  function whenVisible(el, fn) {
    if (!("IntersectionObserver" in window)) return fn();
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { io.disconnect(); fn(); }
    }, { rootMargin: "300px 0px" });
    io.observe(el);
  }
  function loadJSON(url) { return fetch(url).then(function (r) { return r.json(); }); }
  function dataTable(parent, caption, head, rows) {
    var d = html("details", "viz-table", parent);
    html("summary", null, d, caption);
    var wrap = html("div", "viz-table-wrap", d);
    var tb = html("table", null, wrap);
    var tr = html("tr", null, html("thead", null, tb));
    head.forEach(function (h) { html("th", null, tr, h); });
    var body = html("tbody", null, tb);
    rows.forEach(function (r) {
      var row = html("tr", null, body);
      r.forEach(function (c) { html("td", null, row, c); });
    });
  }
  var TABLE_LABEL = lang === "fr" ? "Tableau de données" : "Data table";

  /* ---------- 1. Attention index per mouse ---------- */
  function attention(card, data, t) {
    var host = card.querySelector(".viz-canvas");
    function draw() {
      host.innerHTML = "";
      var W = host.clientWidth;
      var side = W > 520;
      var pw = side ? (W - 16) / 2 : W, ph = 300;
      var conds = ["control", "opto", "led_off"];
      var condLabel = { control: t.control, opto: t.opto, led_off: t.led_off };
      var vals = [];
      data.mice.forEach(function (m) { conds.forEach(function (c) { vals.push(m[c]); }); });
      var y0 = Math.floor(Math.min.apply(null, vals) * 2) / 2, y1 = Math.ceil(Math.max.apply(null, vals) * 2) / 2;
      var tip = tooltip(host);
      var wrap = html("div", null, host);
      wrap.style.display = "grid";
      wrap.style.gridTemplateColumns = side ? "1fr 1fr" : "1fr";
      wrap.style.gap = "16px";
      ["activation", "inhibition"].forEach(function (cohort) {
        var m = { t: 30, r: 18, b: 34, l: 44 };
        var s = svg("svg", { viewBox: "0 0 " + pw + " " + ph, width: pw, height: ph, role: "img", "aria-label": t[cohort] + ", " + t.y_label }, wrap);
        var x = scale(0, 2, m.l + 20, pw - m.r - 20), y = scale(y0, y1, ph - m.b, m.t);
        for (var v = y0; v <= y1 + 1e-9; v += 0.5) {
          svg("line", { x1: m.l, x2: pw - m.r, y1: y(v), y2: y(v), stroke: v === 0 ? "rgba(18,19,21,0.35)" : C.rule, "stroke-width": 1 }, s);
          var tx = svg("text", { x: m.l - 8, y: y(v) + 4, "text-anchor": "end", fill: C.ink3, "font-size": 11, "font-family": "Geist Mono, monospace" }, s);
          tx.textContent = nf(v, 1);
        }
        conds.forEach(function (c, i) {
          var tl = svg("text", { x: x(i), y: ph - 10, "text-anchor": "middle", fill: C.ink2, "font-size": 11.5, "font-family": "Geist Mono, monospace" }, s);
          tl.textContent = condLabel[c];
        });
        var title = svg("text", { x: m.l, y: 14, fill: C.ink, "font-size": 12, "font-family": "Geist Mono, monospace", "letter-spacing": "0.06em" }, s);
        title.textContent = t[cohort].toUpperCase();
        var yl = svg("text", { x: pw - m.r, y: 14, "text-anchor": "end", fill: C.ink3, "font-size": 11, "font-family": "Geist Mono, monospace" }, s);
        yl.textContent = t.y_label;
        var groups = [];
        data.mice.filter(function (d) { return d.cohort === cohort; }).forEach(function (d) {
          var g = svg("g", { tabindex: 0, role: "img", "aria-label": t.mouse + " " + d.id + ": " + conds.map(function (c) { return condLabel[c] + " " + nf(d[c], 3); }).join(", ") }, s);
          g.style.cursor = "pointer";
          g.style.outline = "none";
          var pts = conds.map(function (c, i) { return [x(i), y(d[c])]; });
          var dstr = "M" + pts.map(function (p) { return p.join(","); }).join("L");
          svg("path", { d: dstr, fill: "none", stroke: "transparent", "stroke-width": 14 }, g);
          var line = svg("path", { d: dstr, fill: "none", stroke: C.ink3, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round", opacity: 0.55 }, g);
          var dots = pts.map(function (p) { return svg("circle", { cx: p[0], cy: p[1], r: 4, fill: C.ink2, stroke: C.surface, "stroke-width": 2 }, g); });
          groups.push({ g: g, line: line, dots: dots });
          function on() {
            groups.forEach(function (o) {
              var me = o.g === g;
              o.line.setAttribute("stroke", me ? C.accent : C.ink3);
              o.line.setAttribute("opacity", me ? 1 : 0.18);
              o.dots.forEach(function (dt) { dt.setAttribute("fill", me ? C.accent : C.ink2); dt.setAttribute("opacity", me ? 1 : 0.3); });
            });
            g.parentNode.appendChild(g);
            var r = s.getBoundingClientRect(), hr = host.getBoundingClientRect();
            var scl = r.width / pw;
            tip.show(r.left - hr.left + pts[1][0] * scl, r.top - hr.top + Math.min.apply(null, pts.map(function (p) { return p[1]; })) * scl,
              [t.mouse + " " + d.id + " · " + d.sex].concat(conds.map(function (c) { return condLabel[c] + "  " + nf(d[c], 3); })));
          }
          function off() {
            groups.forEach(function (o) {
              o.line.setAttribute("stroke", C.ink3); o.line.setAttribute("opacity", 0.55);
              o.dots.forEach(function (dt) { dt.setAttribute("fill", C.ink2); dt.setAttribute("opacity", 1); });
            });
            tip.hide();
          }
          g.addEventListener("pointerenter", on);
          g.addEventListener("pointerleave", off);
          g.addEventListener("focus", on);
          g.addEventListener("blur", off);
        });
      });
      dataTable(host, TABLE_LABEL, [t.mouse, "", t.control, t.opto, t.led_off],
        data.mice.map(function (d) { return [d.id + " (" + d.sex + ")", t[d.cohort], nf(d.control, 4), nf(d.opto, 4), nf(d.led_off, 4)]; }));
    }
    draw();
    onResize(host, draw);
  }

  /* ---------- 2. Stimulus playback ---------- */
  function stimulus(card, data, t) {
    var host = card.querySelector(".viz-canvas");
    host.style.minHeight = "0";
    var sides = ["left", "right"];
    var decoded = {};
    sides.forEach(function (sd) {
      decoded[sd] = data[sd].frames.map(function (b64) {
        var bin = atob(b64), out = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
      });
    });
    var grid = html("div", "stim", host);
    var canv = {};
    sides.forEach(function (sd) {
      var col = html("div", null, grid);
      html("div", "stim-label", col, t[sd]);
      var cv = html("canvas", null, col);
      cv.width = data[sd].cols; cv.height = data[sd].rows;
      cv.style.aspectRatio = data[sd].cols + " / " + data[sd].rows;
      cv.setAttribute("role", "img");
      cv.setAttribute("aria-label", t[sd]);
      canv[sd] = cv;
    });
    var controls = html("div", "viz-controls", host);
    var btn = html("button", "viz-btn", controls, t.play);
    btn.type = "button";
    btn.setAttribute("aria-pressed", "false");
    var lab = html("label", null, controls);
    var range = html("input", null, lab);
    range.type = "range"; range.min = 0; range.max = data.right.frames.length - 1; range.value = 0;
    range.setAttribute("aria-label", t.frame);
    var read = html("span", "muted", controls);
    read.style.color = "var(--scope-dim)";
    var k = 0, playing = false, timer = null;
    function paint(sd, idx) {
      var cv = canv[sd], ctx = cv.getContext("2d");
      var rows = data[sd].rows, cols = data[sd].cols, bits = decoded[sd][idx];
      var img = ctx.createImageData(cols, rows);
      var type = data[sd].types ? data[sd].types.charAt(idx) : "";
      for (var i = 0; i < rows * cols; i++) {
        var on = (bits[i >> 3] >> (7 - (i & 7))) & 1;
        var v = type === "b" ? 60 : (on ? 236 : 10);
        img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = type === "b" ? 64 : (on ? 240 : 14); img.data[i * 4 + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    }
    function show(i) {
      k = i;
      paint("left", i); paint("right", i);
      range.value = i;
      var tl = data.left.types ? (t.types[data.left.types.charAt(i)] || "") : "";
      var tr = data.right.types ? (t.types[data.right.types.charAt(i)] || "") : "";
      read.textContent = t.frame + " " + (i + 1) + "/" + data.right.frames.length + " · " + t.time + " " + nf(data.right.t[i], 2) + " s · " + t.left + ": " + tl + " · " + t.right + ": " + tr;
    }
    function step() {
      if (!playing) return;
      var next = (k + 1) % data.right.frames.length;
      var dt = next === 0 ? 400 : Math.max(16, (data.right.t[next] - data.right.t[k]) * 1000);
      show(next);
      timer = setTimeout(step, dt);
    }
    btn.addEventListener("click", function () {
      playing = !playing;
      btn.textContent = playing ? t.pause : t.play;
      btn.setAttribute("aria-pressed", playing ? "true" : "false");
      clearTimeout(timer);
      if (playing) step();
    });
    range.addEventListener("input", function () { show(+range.value); });
    // Open on the first frame where both screens show a pattern
    var firstBoth = 0;
    for (var f = 0; f < data.right.frames.length; f++) {
      if (data.left.types.charAt(f) !== "b" && data.right.types.charAt(f) !== "b") { firstBoth = f; break; }
    }
    show(firstBoth);
  }

  /* ---------- 3. Trial outcomes ---------- */
  function trials(card, data, t) {
    var host = card.querySelector(".viz-canvas");
    var counts = [0, 0, 0];
    data.outcome.forEach(function (o) { counts[o]++; });
    var colors = [C.hit, C.miss, C.fa];
    var names = [t.hit, t.miss, t.fa];
    // Trials grouped by session, in file order
    var bySession = {};
    data.session.forEach(function (s, i) { (bySession[s] = bySession[s] || []).push(i); });
    var sessions = data.sessions;
    var maxN = Math.max.apply(null, sessions.map(function (s) { return bySession[s].length; }));
    // Hit rate per contrast level (hits / (hits + misses))
    var levels = {};
    data.outcome.forEach(function (o, i) {
      var c = data.contrast[i];
      if (c === null || o === 2) return;
      levels[c] = levels[c] || { hit: 0, n: 0 };
      levels[c].n++;
      if (o === 0) levels[c].hit++;
    });
    var lv = Object.keys(levels).map(Number).sort(function (a, b) { return a - b; });

    function draw() {
      host.innerHTML = "";
      legend(host, names.map(function (n, i) { return { label: n + " · " + nInt(counts[i]), color: colors[i] }; }));
      var W = host.clientWidth;
      var wide = W > 760;
      var wrap = html("div", null, host);
      wrap.style.display = "grid";
      wrap.style.gridTemplateColumns = wide ? "minmax(0, 1.7fr) minmax(0, 1fr)" : "1fr";
      wrap.style.gap = "24px";
      wrap.style.marginTop = "14px";
      wrap.style.position = "relative";
      var tip = tooltip(host);

      // Raster on canvas
      var rasterBox = html("div", null, wrap);
      rasterBox.style.position = "relative";
      var rw = wide ? (W - 24) * 1.7 / 2.7 : W;
      var rowH = 13, gap = 3, labelW = 34, top = 4;
      var rh = top + sessions.length * (rowH + gap) + 22;
      var cv = html("canvas", null, rasterBox);
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(rw * dpr); cv.height = Math.round(rh * dpr);
      cv.style.width = rw + "px"; cv.style.height = rh + "px";
      cv.setAttribute("role", "img");
      cv.setAttribute("aria-label", t.title + ". " + names.map(function (n, i) { return n + " " + counts[i]; }).join(", "));
      var ctx = cv.getContext("2d");
      ctx.scale(dpr, dpr);
      var cellW = (rw - labelW) / maxN;
      ctx.font = "10.5px 'Geist Mono', monospace";
      ctx.textBaseline = "middle";
      sessions.forEach(function (s, r) {
        var yy = top + r * (rowH + gap);
        ctx.fillStyle = C.ink3;
        ctx.textAlign = "right";
        ctx.fillText(String(s), labelW - 8, yy + rowH / 2);
        bySession[s].forEach(function (ti, j) {
          ctx.fillStyle = colors[data.outcome[ti]];
          ctx.fillRect(labelW + j * cellW, yy, Math.max(0.6, cellW - (cellW > 2.5 ? 0.6 : 0)), rowH);
        });
      });
      ctx.fillStyle = C.ink3;
      ctx.textAlign = "left";
      ctx.fillText(t.session, 0, rh - 8);
      ctx.textAlign = "right";
      ctx.fillText(t.trial + " →", rw, rh - 8);
      cv.addEventListener("pointermove", function (ev) {
        var r = cv.getBoundingClientRect();
        var px = ev.clientX - r.left, py = ev.clientY - r.top;
        var row = Math.floor((py - top) / (rowH + gap));
        var j = Math.floor((px - labelW) / cellW);
        var s = sessions[row];
        if (s === undefined || j < 0 || j >= bySession[s].length || (py - top) % (rowH + gap) > rowH) { tip.hide(); return; }
        var ti = bySession[s][j];
        var hr = host.getBoundingClientRect();
        tip.show(r.left - hr.left + px, r.top - hr.top + top + row * (rowH + gap) - 2, [
          names[data.outcome[ti]],
          t.session + " " + s + " · " + t.trial + " " + (j + 1),
          t.contrast + " " + (data.contrast[ti] === null ? "–" : nf(data.contrast[ti], 1)) + " · " + data.cue[ti]
        ]);
      });
      cv.addEventListener("pointerleave", tip.hide);

      // Hit rate by contrast (single series)
      var chartBox = html("div", null, wrap);
      var cw = wide ? (W - 24) / 2.7 : W, ch = Math.max(220, rh);
      var m = { t: 30, r: 26, b: 38, l: 44 };
      var s = svg("svg", { viewBox: "0 0 " + cw + " " + ch, width: cw, height: ch, role: "img", "aria-label": t.hit_rate }, chartBox);
      var x = scale(0, 1, m.l, cw - m.r), y = scale(0, 1, ch - m.b, m.t);
      var ttl = svg("text", { x: 0, y: 12, fill: C.ink, "font-size": 12, "font-family": "Geist Mono, monospace" }, s);
      ttl.textContent = t.hit_rate;
      [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
        svg("line", { x1: m.l, x2: cw - m.r, y1: y(v), y2: y(v), stroke: C.rule }, s);
        var tx = svg("text", { x: m.l - 8, y: y(v) + 4, "text-anchor": "end", fill: C.ink3, "font-size": 11, "font-family": "Geist Mono, monospace" }, s);
        tx.textContent = Math.round(v * 100) + "%";
      });
      [0, 0.2, 0.4, 0.6, 0.8, 1].forEach(function (v) {
        var tx = svg("text", { x: x(v), y: ch - m.b + 18, "text-anchor": "middle", fill: C.ink3, "font-size": 11, "font-family": "Geist Mono, monospace" }, s);
        tx.textContent = nf(v, 1);
      });
      var xl = svg("text", { x: (m.l + cw - m.r) / 2, y: ch - 4, "text-anchor": "middle", fill: C.ink2, "font-size": 11, "font-family": "Geist Mono, monospace" }, s);
      xl.textContent = t.contrast;
      var pts = lv.map(function (c) { return [x(c), y(levels[c].hit / levels[c].n), c]; });
      svg("path", { d: "M" + pts.map(function (p) { return p[0] + "," + p[1]; }).join("L"), fill: "none", stroke: C.hit, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }, s);
      pts.forEach(function (p, i) {
        var lvl = levels[p[2]];
        var g = svg("g", { tabindex: 0 }, s);
        g.style.outline = "none";
        svg("circle", { cx: p[0], cy: p[1], r: 12, fill: "transparent" }, g);
        var dot = svg("circle", { cx: p[0], cy: p[1], r: 4.5, fill: C.hit, stroke: C.surface, "stroke-width": 2 }, g);
        if (i === 0 || i === pts.length - 1) {
          var lbl = svg("text", { x: p[0] + (i === 0 ? 2 : -8), y: p[1] + (i === 0 ? 20 : -10), "text-anchor": i === 0 ? "start" : "end", fill: C.ink, "font-size": 11.5, "font-family": "Geist Mono, monospace" }, s);
          lbl.textContent = Math.round(lvl.hit / lvl.n * 100) + "%";
        }
        function on() {
          dot.setAttribute("r", 6);
          var r = s.getBoundingClientRect(), hr = host.getBoundingClientRect(), k = r.width / cw;
          tip.show(r.left - hr.left + p[0] * k, r.top - hr.top + p[1] * k - 4, [
            t.contrast + " " + nf(p[2], 1),
            Math.round(lvl.hit / lvl.n * 100) + "% · " + nInt(lvl.hit) + "/" + nInt(lvl.n) + " " + t.trials_word
          ]);
        }
        function off() { dot.setAttribute("r", 4.5); tip.hide(); }
        g.addEventListener("pointerenter", on); g.addEventListener("pointerleave", off);
        g.addEventListener("focus", on); g.addEventListener("blur", off);
      });
      dataTable(host, TABLE_LABEL, [t.contrast, t.hit, t.miss, "%"],
        lv.map(function (c) { var l = levels[c]; return [nf(c, 1), nInt(l.hit), nInt(l.n - l.hit), Math.round(l.hit / l.n * 100) + "%"]; }));
    }
    draw();
    onResize(host, draw);
  }

  /* ---------- 4. Mbd2 methylation sites ---------- */
  function mbd2(card, data, t) {
    var host = card.querySelector(".viz-canvas");
    var order = ["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","X","Y","Un"];
    var rows = data.rows.map(function (r) {
      var chr = /_random|^Un/.test(r[0]) ? "Un" : r[0];
      return { chr: chr, raw: r[0], pos: r[1], gene: r[2], y: r[3], diff: r[4] };
    });
    var maxPos = {};
    rows.forEach(function (r) { maxPos[r.chr] = Math.max(maxPos[r.chr] || 0, r.pos); });
    var chrs = order.filter(function (c) { return maxPos[c]; });
    var nHyper = rows.filter(function (r) { return r.diff > 0; }).length;

    function draw() {
      host.innerHTML = "";
      legend(host, [
        { label: t.hyper + " · " + nInt(nHyper), color: C.hyper, round: true },
        { label: t.hypo + " · " + nInt(rows.length - nHyper), color: C.hypo, round: true }
      ]);
      var W = host.clientWidth, H = W > 700 ? 380 : 320;
      var m = { t: 24, r: 10, b: 40, l: 44 };
      var tip = tooltip(host);
      var box = html("div", null, host);
      box.style.position = "relative";
      box.style.marginTop = "10px";
      var s = svg("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, role: "img", "aria-label": t.title }, box);
      // Chromosome bands sized by the largest position present (min width so small ones stay visible)
      var total = 0, minW = 0.018;
      var widths = chrs.map(function (c) { return Math.max(maxPos[c], 1); });
      var sum = widths.reduce(function (a, b) { return a + b; }, 0);
      widths = widths.map(function (w) { return Math.max(w / sum, minW); });
      total = widths.reduce(function (a, b) { return a + b; }, 0);
      var plotW = W - m.l - m.r, start = {}, acc = m.l;
      chrs.forEach(function (c, i) { start[c] = [acc, widths[i] / total * plotW]; acc += widths[i] / total * plotW; });
      var yMax = Math.ceil(Math.max.apply(null, rows.map(function (r) { return r.y; })) / 5) * 5;
      var y = scale(0, yMax, H - m.b, m.t);
      chrs.forEach(function (c, i) {
        if (i % 2 === 0) svg("rect", { x: start[c][0], y: m.t, width: start[c][1], height: H - m.b - m.t, fill: "rgba(18,19,21,0.035)" }, s);
        var skip = W < 560 && i % 2 === 1 && c !== "X";
        if (!skip) {
          var tx = svg("text", { x: start[c][0] + start[c][1] / 2, y: H - m.b + 16, "text-anchor": "middle", fill: C.ink3, "font-size": 10.5, "font-family": "Geist Mono, monospace" }, s);
          tx.textContent = c;
        }
      });
      for (var v = 0; v <= yMax; v += 5) {
        svg("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: C.rule }, s);
        var ty = svg("text", { x: m.l - 8, y: y(v) + 4, "text-anchor": "end", fill: C.ink3, "font-size": 11, "font-family": "Geist Mono, monospace" }, s);
        ty.textContent = v;
      }
      var xl = svg("text", { x: m.l + plotW / 2, y: H - 6, "text-anchor": "middle", fill: C.ink2, "font-size": 11, "font-family": "Geist Mono, monospace" }, s);
      xl.textContent = t.chromosome;
      var yl = svg("text", { x: m.l, y: 12, fill: C.ink2, "font-size": 11, "font-family": "Geist Mono, monospace" }, s);
      yl.textContent = t.y_label;
      var pts = rows.map(function (r) {
        var b = start[r.chr];
        return { r: r, x: b[0] + 2 + (r.pos / maxPos[r.chr]) * (b[1] - 4), y: y(r.y) };
      });
      var g = svg("g", {}, s);
      pts.forEach(function (p) {
        svg("circle", { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 2.4, fill: p.r.diff > 0 ? C.hyper : C.hypo, "fill-opacity": 0.72 }, g);
      });
      // Label the three most significant sites
      pts.slice().sort(function (a, b) { return b.r.y - a.r.y; }).slice(0, 3).forEach(function (p) {
        svg("circle", { cx: p.x, cy: p.y, r: 4.5, fill: p.r.diff > 0 ? C.hyper : C.hypo, stroke: C.surface, "stroke-width": 2 }, s);
        var lbl = svg("text", { x: p.x + 8, y: p.y + 4, fill: C.ink, "font-size": 11.5, "font-family": "Geist Mono, monospace" }, s);
        lbl.textContent = p.r.gene || ("chr" + p.r.raw);
        if (p.x > W - 120) { lbl.setAttribute("x", p.x - 8); lbl.setAttribute("text-anchor", "end"); }
      });
      var ring = svg("circle", { r: 6, fill: "none", stroke: C.ink, "stroke-width": 1.5, opacity: 0 }, s);
      s.addEventListener("pointermove", function (ev) {
        var r = s.getBoundingClientRect(), k = W / r.width;
        var px = (ev.clientX - r.left) * k, py = (ev.clientY - r.top) * k;
        var best = null, bd = 12 * 12;
        for (var i = 0; i < pts.length; i++) {
          var dx = pts[i].x - px, dy = pts[i].y - py, d = dx * dx + dy * dy;
          if (d < bd) { bd = d; best = pts[i]; }
        }
        if (!best) { tip.hide(); ring.setAttribute("opacity", 0); return; }
        ring.setAttribute("cx", best.x); ring.setAttribute("cy", best.y); ring.setAttribute("opacity", 1);
        var hr = host.getBoundingClientRect();
        var p = Math.pow(10, -best.r.y);
        tip.show(r.left - hr.left + best.x / k, r.top - hr.top + best.y / k - 4, [
          (best.r.gene || "–"),
          "chr" + best.r.raw + ":" + nInt(best.r.pos),
          "KO−WT " + (best.r.diff > 0 ? "+" : "") + nf(best.r.diff, 1) + " · p = " + p.toExponential(1)
        ]);
      });
      s.addEventListener("pointerleave", function () { tip.hide(); ring.setAttribute("opacity", 0); });
      var top = rows.slice().sort(function (a, b) { return b.y - a.y; }).slice(0, 20);
      dataTable(host, lang === "fr" ? "Les 20 sites les plus significatifs" : "The 20 most significant sites",
        [t.gene, t.chromosome, "KO−WT", "p"],
        top.map(function (r) { return [r.gene || "–", "chr" + r.raw + ":" + nInt(r.pos), (r.diff > 0 ? "+" : "") + nf(r.diff, 1), Math.pow(10, -r.y).toExponential(1)]; }));
    }
    draw();
    onResize(host, draw);
  }

  /* ---------- Boot ---------- */
  var builders = { attention: attention, stimulus: stimulus, trials: trials, mbd2: mbd2 };
  document.querySelectorAll("[data-viz]").forEach(function (card) {
    var kind = card.getAttribute("data-viz"), t = i18n(card);
    if (!builders[kind]) return;
    whenVisible(card, function () {
      loadJSON(card.getAttribute("data-src")).then(function (d) { builders[kind](card, d, t); })
        .catch(function () { card.querySelector(".viz-canvas").textContent = "—"; });
    });
  });
})();
