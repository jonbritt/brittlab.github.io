/* Home banner: a pixel ripple across the whole image, drawn in WebGL over the
   banner photo. It starts where the mouse enters the title and runs once;
   the mouse has to leave the panel and come back to start another.
   Mouse only (no touch), skipped for reduced motion or without WebGL. */
(function () {
  "use strict";

  var root = document.querySelector("[data-banner-fx]");
  var card = document.querySelector(".banner-card");
  var title = card && card.querySelector("h1");
  if (!root || !title || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var img = root.querySelector("img");
  var canvas = root.querySelector("canvas");
  var gl = canvas.getContext("webgl", { alpha: false, antialias: false, premultipliedAlpha: false });
  if (!gl) return;

  var VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}";
  var FRAG = [
    "precision highp float;",
    "uniform sampler2D u_tex;",
    "uniform vec2 u_res;     // canvas size, device px",
    "uniform vec2 u_img;     // image size, px",
    "uniform vec2 u_origin;  // ripple centre, device px from top-left",
    "uniform float u_radius; // current wavefront radius, device px",
    "uniform float u_life;   // 0..1 over the ripple's run",
    "uniform float u_dpr;",
    // Same mapping as CSS object-fit: cover; object-position: 50% 45%
    "vec2 coverUV(vec2 p){",
    " float s=max(u_res.x/u_img.x,u_res.y/u_img.y);",
    " vec2 size=u_img*s; vec2 off=(u_res-size)*vec2(0.5,0.45);",
    " return clamp((p-off)/size,0.001,0.999);",
    "}",
    "vec3 tap(vec2 p){return texture2D(u_tex,coverUV(p)).rgb;}",
    "void main(){",
    " vec2 p=vec2(gl_FragCoord.x,u_res.y-gl_FragCoord.y);",
    " vec2 dv=p-u_origin;",
    " float d=length(dv);",
    " float x=d-u_radius;                 // > 0 ahead of the wavefront, < 0 behind it",
    " float wl=124.0*u_dpr;               // spacing between rings",
    " float front=14.0*u_dpr, trail=330.0*u_dpr;",
    " float env=x>0.0 ? exp(-x*x/(2.0*front*front)) : exp(x/trail);",
    " env*=smoothstep(0.0,0.04,u_life)*(1.0-smoothstep(0.82,1.0,u_life))*(1.0-0.3*u_life);",
    " if(env<0.01){gl_FragColor=vec4(tap(p),1.0);return;}",
    " vec2 dir=dv/max(d,1.0);",
    // refraction between the rings: push the image in and out along the radius
    " vec2 off=dir*sin(x/wl*6.2831853)*env*12.0*u_dpr;",
    // big pixels in the leading ring, smaller in the ones behind it
    " float cell=(x>-0.5*wl ? 30.0 : x>-1.5*wl ? 22.0 : 16.0)*u_dpr;",
    " vec2 q=(floor(p/cell)+0.5)*cell;",
    // decide ring membership per block so each block is wholly in or out
    " float xq=length(q-u_origin)-u_radius;",
    " float envq=xq>0.0 ? exp(-xq*xq/(2.0*front*front)) : exp(xq/trail);",
    " float crest=cos(xq/wl*6.2831853);",
    " float qm=step(0.30,crest)*step(0.10,envq*(1.0-smoothstep(0.82,1.0,u_life)));",
    " vec3 pix=tap(q+off);",
    " vec2 inCell=abs(fract(p/cell)-0.5);",
    " pix*=1.0-0.12*step(0.45,max(inCell.x,inCell.y));   // crisp pixel edges",
    " pix*=1.0+0.14*envq;                                   // rings catch the light",
    " vec3 col=mix(tap(p+off),pix,qm);",
    " gl_FragColor=vec4(col,1.0);",
    "}"
  ].join("\n");

  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  var vs = shader(gl.VERTEX_SHADER, VERT), fs = shader(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var U = {};
  ["u_tex", "u_res", "u_img", "u_origin", "u_radius", "u_life", "u_dpr"].forEach(function (n) {
    U[n] = gl.getUniformLocation(prog, n);
  });

  var ready = false;
  function upload() {
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      ready = true;
    } catch (e) { ready = false; }
  }
  if (img.complete && img.naturalWidth) upload();
  else img.addEventListener("load", upload, { once: true });

  var dpr = 1, W = 1, H = 1;
  function size() {
    var r = root.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = Math.max(1, Math.round(r.width * dpr));
    H = Math.max(1, Math.round(r.height * dpr));
    canvas.width = W; canvas.height = H;
    gl.viewport(0, 0, W, H);
  }
  size();
  if (window.ResizeObserver) new ResizeObserver(size).observe(root);
  else window.addEventListener("resize", size);

  // One ripple per visit to the panel
  var armed = true, ripple = null, raf = 0;
  title.addEventListener("pointerenter", function (ev) {
    if (ev.pointerType !== "mouse" || !armed || !ready) return;
    armed = false;
    var r = root.getBoundingClientRect();
    var ox = (ev.clientX - r.left) * dpr, oy = (ev.clientY - r.top) * dpr;
    // Far enough to clear the farthest corner, plus the trailing rings
    var far = Math.max(Math.hypot(ox, oy), Math.hypot(W - ox, oy), Math.hypot(ox, H - oy), Math.hypot(W - ox, H - oy));
    var reach = far + 320 * dpr;
    ripple = { x: ox, y: oy, reach: reach, dur: Math.min(3.6, Math.max(2.4, reach / dpr / 550)), t0: performance.now() };
    canvas.classList.add("is-on");
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  });
  card.addEventListener("pointerleave", function (ev) {
    if (ev.pointerType === "mouse") armed = true;
  });

  function frame(now) {
    if (!ripple) return;
    var life = (now - ripple.t0) / 1000 / ripple.dur;
    if (life >= 1) { ripple = null; canvas.classList.remove("is-on"); return; }
    var ease = 1 - Math.pow(1 - life, 1.25);
    gl.uniform1i(U.u_tex, 0);
    gl.uniform2f(U.u_res, W, H);
    gl.uniform2f(U.u_img, img.naturalWidth, img.naturalHeight);
    gl.uniform2f(U.u_origin, ripple.x, ripple.y);
    gl.uniform1f(U.u_radius, ripple.reach * ease);
    gl.uniform1f(U.u_life, life);
    gl.uniform1f(U.u_dpr, dpr);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden && ripple) { ripple = null; canvas.classList.remove("is-on"); }
  });
  canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); ready = false; ripple = null; canvas.classList.remove("is-on"); });
})();
